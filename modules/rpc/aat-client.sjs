/*
 * Oni Apollo 'rpc/aat-client' module
 * Asymmetric AJAX Transport Client
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2012 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
/**
   @module  rpc/aat-client
   @summary Asymmetric AJAX Transport Client
   @home    apollo:rpc/aat-client
   @desc    AAT is an efficient bi-directional message exchange protocol over HTTP
*/

var http = require('apollo:http');
var coll = require('apollo:collection');
var func = require('apollo:function');

var AAT_VERSION   = '1';
var SERVER_PATH   = '__oni/aat';

/*

 openTransport(server) -> Transport

 Transport: { send(message), receive()->message, close() }

 Transport.send(message)
 Transport.receive() -> message

 2 messages: send, poll

  // this always returns "immediately":
 ['send_'+ID, MES*] -> ['ok',MES*] | ['error_id'] | ['error_xx']
 ['send', MES*] -> ['ok_'+ID, MES*] | ['error_xx']


 // this returns after polling interval (or earlier):
 ['poll_'+ID, MES*] -> ['ok',MES*] | ['error_id'] | ['error_xx']

 // this returns "immediately" (equivalent to 'send'):
 ['poll', MES*] -> ['ok_'+ID, MES*] | ['error_xx']
*/
/**
   @function openTransport
   @summary  Establish an AAT transport to the given server
   @param {optional String} [server='/'] AAT server to connect to
   @return {::Transport}
*/
function openTransport(server) {
  server = server || "/";
  
  var transport_id_suffix = '';

  var receive_q = [];
  var resume_receive;
  var poll_stratum;

  function poll_loop() {
    try {
      while (1) {
        // assert(transport_id_suffix)
        var messages = http.request([server, SERVER_PATH, AAT_VERSION],
                                    { method: 'POST',
                                      body: JSON.stringify(["poll#{transport_id_suffix}"])
                                    });
        messages = JSON.parse(messages);
        
        // check for error response:
        if (!messages[0] || messages[0] != 'ok') {
          throw new Error("Transport Error (#{messages[0]})");
        }
        
        // put any messages in receive queue:
        messages.shift();
        coll.each(messages) {
          |mes| 
          receive_q.unshift(mes);
        }
        // prod receiver:
        if (receive_q.length && resume_receive) resume_receive();
      }
    }
    catch (e) {
      transport.close();
      throw e;
    }
  }


  //----

  var transport = {
    active: true,

    send(message) {
      if (!this.active) throw new Error("inactive transport");

      try {
        var result = http.request([server,SERVER_PATH,AAT_VERSION],
                                  { method: 'POST', 
                                    body: JSON.stringify(["send#{transport_id_suffix}",message])
                                  });
        
        result = JSON.parse(result);
        
        // check for error response:
        if (!result[0] || result[0].indexOf('ok') != 0)
          throw new Error("Transport Error (#{result[0]})");
        
        // parse response code:
        if (!transport_id_suffix.length) {
          // we're expecting an id
          if (result[0].indexOf('ok_') != 0) 
            throw new Error("Transport Error (Missing ID)");
          // ok, all good, we've got an id:
          transport_id_suffix = result[0].substr(2);
          this.id = transport_id_suffix.substr(1);
          
          // start our polling loop:
          poll_stratum = spawn (hold(0),poll_loop());
        }
        else if (result[0] != 'ok')
          throw new Error("Transport Error (#{result[0]} instead of 'ok')");
        
        // put any messages in receive queue:
        result.shift();
        coll.each(result) {
          |mes| 
          receive_q.unshift(mes);
        }
        // prod receiver:
        if (receive_q.length && resume_receive) resume_receive();
      }
      catch (e) {
        this.close();
        throw e;
      }
    },
    receive: func.sequential(function() { 
      if (!this.active) throw new Error("inactive transport");

      if (!receive_q.length) {
        waitfor(var e) {
          resume_receive = resume;
        }
        finally {
          resume_receive = undefined;
        }
      }
      if (e) throw e; // exception thrown

      return receive_q.pop();
    }),
    close() {
      this.active = false;
      if (poll_stratum) poll_stratum.abort();
      if (resume_receive) resume_receive(new Error('transport closed'));
    }
  };

  return transport;
}
exports.openTransport = openTransport;
