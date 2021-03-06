/*
 * Oni StratifiedJS Runtime
 * Client-side Cross-Browser implementation
 *
 * Version: '0.14.0-1-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2010-2013 Oni Labs, http://onilabs.com
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
var __oni_rt={};(function(exports){var UNDEF;








































































function CFException_toString(){var rv=this.name+": "+this.message;

if(this.__oni_stack){
for(var i=0;i<this.__oni_stack.length;++i){
var line=this.__oni_stack[i];
if(line.length==1)line=line[0];else line='    at '+line.slice(0,2).join(':');



rv+='\n'+line;
}
}
return rv;
}

function adopt_native_stack(e,caller_module){if(!e.stack)return;


if(exports.hostenv!=='nodejs'){


e.stack='';
return;
}
var stack=String(e.stack);




var firstColon=stack.indexOf(': ');
var msgStart=(firstColon===-1)?0:firstColon+2;


if(stack.lastIndexOf('\n',msgStart)!=-1)msgStart=0;

var msg=String(e.message);
if(msg&&stack.lastIndexOf(msg,msgStart)==msgStart){
stack=stack.slice(msgStart+msg.length);
}else{

stack=stack.replace(/^\w*Error/,'');
}
stack=stack.trim();
e.stack="";
var lines=stack.split("\n");
var i;
for(i=0;i<lines.length;i++ ){

if((caller_module&&lines[i].indexOf(caller_module)!=-1)||lines[i].indexOf("stratified-node.js")!=-1||lines[i].indexOf("stratified.js")!=-1){



break;
}
e.__oni_stack.push([lines[i]]);
}
}

var token_oniE={};
function CFException(type,value,line,file){this.type=type;

this.val=value;

if(type=="t"&&(value instanceof Error||(typeof value=='object'&&value.message))){

if(value._oniE!==token_oniE){

value._oniE=token_oniE;
value.__oni_stack=[];
value.line=line;
value.file=file||"unknown SJS source";

adopt_native_stack(value,file);

if(!value.hasOwnProperty('toString'))value.toString=CFException_toString;
}


if(line)value.__oni_stack.push([file||'unknown SJS source',line]);

}

}

var CFETypes={r:"return",b:"break",c:"continue",blb:"blocklambda break"};
CFException.prototype={__oni_cfx:true,toString:function(){

if(this.type in CFETypes)return "Unexpected "+CFETypes[this.type]+" statement";else return "Uncaught internal SJS control flow exception ("+this.type+":: "+this.val+")";




},mapToJS:function(augment){
if(this.type=="t"){




throw (augment&&this.val.__oni_stack)?new Error(this.val.toString()):this.val;
}else if(!this.ef)throw new Error(this.toString());else throw this;




}};


















function ReturnToParentContinuation(frame,idx,val){this.frame=frame;

this.idx=idx;
this.val=val;
}
ReturnToParentContinuation.prototype={execute:function(){
return this.frame.cont(this.idx,this.val)}};








function cont(frame,idx,val){var rv=frame.cont(idx,val);

while(rv instanceof ReturnToParentContinuation){
rv=rv.execute();
}
return rv;
}

function is_ef(obj){return obj&&obj.__oni_ef;

}

function setEFProto(t){for(var p in EF_Proto)t[p]=EF_Proto[p]}




function mergeCallstacks(target_ef,src_ef){if(target_ef.callstack){





target_ef.callstack=target_ef.callstack.concat(src_ef.callstack);
if(target_ef.callstack.length>20)target_ef.callstack.splice(20/2,target_ef.callstack.length-20+1,['    ...(frames omitted)']);



}else{


target_ef.callstack=src_ef.callstack;
}
}


var EF_Proto={toString:function(){
return "<suspended SJS>"},__oni_ef:true,setChildFrame:function(ef,idx){


if(this.child_frame&&this.child_frame.callstack){


mergeCallstacks(ef,this.child_frame);
}
this.async=true;
this.child_frame=ef;
ef.parent=this;
ef.parent_idx=idx;
},quench:function(){






if(this.child_frame)this.child_frame.quench();




},abort:function(){

if(!this.child_frame){




this.aborted=true;
return this;
}else return this.child_frame.abort();


},returnToParent:function(val){

if((val instanceof CFException)&&val.type=='t'&&this.callstack&&val.val.__oni_stack){

val.val.__oni_stack=val.val.__oni_stack.concat(this.callstack);
}
if(this.swallow_r){
if((val instanceof CFException)){
if(val.type=="r"){
if(!val.ef||val.ef==this)val=val.val;

}
}else if(is_ef(val))val.swallow_r=this.swallow_r;else if(this.swallow_r!=2)val=UNDEF;




}




this.unreturnable=true;





if(this.async){
if(this.parent){






return new ReturnToParentContinuation(this.parent,this.parent_idx,val);






}else if((val instanceof CFException)){





val.mapToJS(true);
}
}else return val;


}};








var token_dis={};


function execIN(node,env){if(!node||node.__oni_dis!=token_dis){

return node;
}

return node.exec(node.ndata,env);
}
exports.ex=execIN;





exports.exseq=function(aobj,tobj,file,args){var rv=I_seq(args,new Env(aobj,tobj,file));


if((rv instanceof CFException))return rv.mapToJS();

return rv;
};



exports.exbl=function(env,args){var rv=I_seq(args,env);


if((rv instanceof CFException))return rv.mapToJS();

return rv;
};




function makeINCtor(exec){return function(){
return {exec:exec,ndata:arguments,__oni_dis:token_dis};





};
}


















function Env(aobj,tobj,file,blref,blscope){this.aobj=aobj;

this.tobj=tobj;
this.file=file;
this.blref=blref;
this.blscope=blscope;
}

function copyEnv(e){return new Env(e.aobj,e.tobj,e.file,e.blref,e.blscope);

}






function I_call(ndata,env){try{

var rv=(ndata[0]).call(env);
if(is_ef(rv)){

if(!rv.callstack)rv.callstack=[];
rv.callstack.push([env.file,ndata[1]]);
}
return rv;
}catch(e){

if((e instanceof CFException)){
if(e.type=='blb'&&e.ef==env.blscope){



return UNDEF;
}
}else{
e=new CFException("t",e,ndata[1],env.file);
}
return e;
}
}
exports.C=makeINCtor(I_call);






function I_nblock(ndata,env){try{

return (ndata[0]).call(env);
}catch(e){

if(!(e instanceof CFException)){
e=new CFException("t",e,ndata[1],env.file);
}
return e;
}
}
exports.Nb=makeINCtor(I_nblock);





function I_blocklambda(ndata,env){return ndata[0].bind(env);

}
exports.Bl=makeINCtor(I_blocklambda);















function EF_Seq(ndata,env){this.ndata=ndata;

this.env=env;

if(ndata[0]&8){
env.blref=this;
env.blscope=this;
}else if(ndata[0]&1){

this.env=copyEnv(env);
this.env.blscope=null;
}

this.tailcall=!(ndata[0]&8);




this.swallow_r=ndata[0]&1;
if(ndata[0]&32)this.swallow_r=2;



this.sc=ndata[0]&(2|4);



if(ndata[0]&16){
this.unreturnable=true;


this.toplevel=true;
}
}
setEFProto(EF_Seq.prototype={});
EF_Seq.prototype.cont=function(idx,val){if(is_ef(val)){



this.setChildFrame(val,idx);
}else{

if((val instanceof CFException)){

if(val.type=='blb'&&val.ef==this.env.blscope){
val=UNDEF;
}else{


return this.returnToParent(val);
}
}
while(idx<this.ndata.length){
if(this.sc&&idx>1){

if(this.sc==2){
if(val)break;
}else{

if(!val)break;
}
}
this.child_frame=null;
val=execIN(this.ndata[idx],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
if(!is_ef(val))return this.returnToParent(val);

}
}
if((++idx==this.ndata.length&&this.tailcall)||(val instanceof CFException)){

break;
}
if(is_ef(val)){
this.setChildFrame(val,idx);
return this;
}
}
return this.returnToParent(val);
}
};

function I_seq(ndata,env){return cont(new EF_Seq(ndata,env),1);

}
exports.Seq=makeINCtor(I_seq);

















function EF_Sc(ndata,env){this.ndata=ndata;

this.env=env;
this.i=2;
this.pars=[];
}
setEFProto(EF_Sc.prototype={});

EF_Sc.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else if((val instanceof CFException)){

return this.returnToParent(val);
}else{

this.child_frame=null;
if(idx==1){

this.pars.push(val);
}
var rv;
while(this.i<this.ndata.length){
rv=execIN(this.ndata[this.i],this.env);
if(this.aborted){

if(is_ef(rv)){
rv.quench();
rv=rv.abort();
if(!is_ef(rv))return this.returnToParent(rv);

}
}

++this.i;
if((rv instanceof CFException))return this.returnToParent(rv);
if(is_ef(rv)){
this.setChildFrame(rv,1);
return this;
}
this.pars.push(rv);
}
this.child_frame=null;


try{
rv=this.ndata[1].apply(this.env,this.pars);
}catch(e){

rv=new CFException("t",e,this.ndata[0],this.env.file);


}
return this.returnToParent(rv);
}
};

function I_sc(ndata,env){return cont(new EF_Sc(ndata,env),0);

}

exports.Sc=makeINCtor(I_sc);





function testIsFunction(f){if(typeof f=="function")return true;










return !!/(?:\[[^o])|(?:^\/)/.exec(""+f);
}












function EF_Fcall(ndata,env){this.ndata=ndata;

this.env=env;
this.i=2;
this.pars=[];
}
setEFProto(EF_Fcall.prototype={});

EF_Fcall.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else if((val instanceof CFException)){

return this.returnToParent(val);
}else if(idx==2){


return this.returnToParent(this.o);
}else{

if(idx==1){

if(this.i==3)this.l=val;else this.pars.push(val);



}
var rv;
while(this.i<this.ndata.length){
rv=execIN(this.ndata[this.i],this.env);
if(this.aborted){

if(is_ef(rv)){
rv.quench();
rv=rv.abort();
if(!is_ef(rv))return this.returnToParent(rv);

}
}

++this.i;
if((rv instanceof CFException))return this.returnToParent(rv);
if(is_ef(rv)){
this.child_frame=null;
this.setChildFrame(rv,1);
return this;
}
if(this.i==3)this.l=rv;else this.pars.push(rv);



}

this.child_frame=null;


try{
switch(this.ndata[0]){case 0:



if(typeof this.l=="function"){
rv=this.l.apply(null,this.pars);
}else if(!testIsFunction(this.l)){

rv=new CFException("t",new Error("'"+this.l+"' is not a function"),this.ndata[1],this.env.file);



}else{



var command="this.l(";
for(var i=0;i<this.pars.length;++i){
if(i)command+=",";
command+="this.pars["+i+"]";
}
command+=")";
rv=eval(command);
}
break;
case 1:

if(typeof this.l[0]==='undefined'){
rv=new CFException("t",new Error("'"+this.l[1]+"' on '"+this.l[0]+"' is not a function"),this.ndata[1],this.env.file);



}else if(typeof this.l[0][this.l[1]]=="function"){



rv=this.l[0][this.l[1]].apply(this.l[0],this.pars);
}else if((UA!="msie")&&!testIsFunction(this.l[0][this.l[1]])){













rv=new CFException("t",new Error("'"+this.l[0][this.l[1]]+"' is not a function"),this.ndata[1],this.env.file);



}else{



var command="this.l[0][this.l[1]](";
for(var i=0;i<this.pars.length;++i){
if(i)command+=",";
command+="this.pars["+i+"]";
}
command+=")";
rv=eval(command);
}
break;
case 2:




var ctor=this.l;
if(ctor&&(ctor==Array||ctor==Boolean||ctor==Date||ctor==Error||ctor==EvalError||ctor==Function||ctor==Math||ctor==Number||ctor==Object||ctor==RangeError||ctor==ReferenceError||ctor==RegExp||ctor==String||ctor==SyntaxError||ctor==TypeError||ctor==URIError||ctor==window.XMLHttpRequest||ctor==window.ActiveXObject||ctor==window.XDomainRequest||!ctor.apply)){






var pars=this.pars;


rv=new (Function.prototype.bind.apply(ctor,[null].concat(pars)))();
}else if(!testIsFunction(ctor)){

rv=new CFException("t",new Error("'"+ctor+"' is not a function"),this.ndata[1],this.env.file);



}else{



var f=function(){};
f.prototype=ctor.prototype;
this.o=new f();
rv=ctor.apply(this.o,this.pars);
if(is_ef(rv)){

this.setChildFrame(rv,2);
return this;
}else{



if(!rv||"object function".indexOf(typeof rv)==-1)rv=this.o;

}
}
break;
default:
rv=new CFException("i","Invalid Fcall mode");
}
}catch(e){







if((e instanceof CFException)){

if(e.type=='blb'&&e.ef==this.env.blscope){
rv=UNDEF;
}else rv=e;


}else rv=new CFException("t",e,this.ndata[1],this.env.file);




}
if(is_ef(rv)){

if(!rv.callstack)rv.callstack=[];
rv.callstack.push([this.env.file,this.ndata[1]]);
}
return this.returnToParent(rv);
}
};

function I_fcall(ndata,env){return cont(new EF_Fcall(ndata,env),0);

}

exports.Fcall=makeINCtor(I_fcall);












function EF_If(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_If.prototype={});

EF_If.prototype.cont=function(idx,val){switch(idx){case 0:



val=execIN(this.ndata[0],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
if(!is_ef(val))return this.returnToParent(val);

}
}


case 1:
if((val instanceof CFException))break;
if(is_ef(val)){
this.setChildFrame(val,1);
return this;
}

if(val)val=execIN(this.ndata[1],this.env);else val=execIN(this.ndata[2],this.env);



break;
default:
val=new CFException("i","invalid state in EF_If");
}
return this.returnToParent(val);
};

function I_if(ndata,env){return cont(new EF_If(ndata,env),0);

}

exports.If=makeINCtor(I_if);





var Default={};
exports.Default=Default;





















function EF_Switch(ndata,env){this.ndata=ndata;

this.env=env;
this.phase=0;
}
setEFProto(EF_Switch.prototype={});

EF_Switch.prototype.cont=function(idx,val){switch(this.phase){case 0:


if(idx==0){
val=execIN(this.ndata[0],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
if(!is_ef(val))return this.returnToParent(val);

}
}
}
if((val instanceof CFException))return this.returnToParent(val);
if(is_ef(val)){
this.setChildFrame(val,1);
return this;
}
this.phase=1;
this.testval=val;
idx=-1;
case 1:
while(true){
if(idx>-1){
if((val instanceof CFException))return this.returnToParent(val);
if(is_ef(val)){
this.setChildFrame(val,idx);
return this;
}else if(val==Default||val==this.testval)break;


}
if(++idx>=this.ndata[1].length)return this.returnToParent(null);


this.child_frame=null;
val=execIN(this.ndata[1][idx][0],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
if(!is_ef(val))return this.returnToParent(val);

}
}
}
this.phase=2;
val=0;
case 2:
while(true){
if(is_ef(val)){
this.setChildFrame(val,idx);
return this;
}
if((val instanceof CFException)){
if(val.type=="b"){
val=val.val;
}
return this.returnToParent(val);
}
if(idx>=this.ndata[1].length){
return this.returnToParent(val);
}
this.child_frame=null;
val=execIN(this.ndata[1][idx][1],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
if(!is_ef(val))return this.returnToParent(val);

}
}
++idx;
}
default:
throw new Error("Invalid phase in Switch SJS node");
}
};

function I_switch(ndata,env){return cont(new EF_Switch(ndata,env),0);

}

exports.Switch=makeINCtor(I_switch);





















function EF_Try(ndata,env){this.ndata=ndata;

this.env=env;
this.state=0;
}
setEFProto(EF_Try.prototype={});

EF_Try.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,this.state);
}else{

switch(this.state){case 0:

this.state=1;
val=execIN(this.ndata[1],this.env);

if(is_ef(val)){
this.setChildFrame(val);
return this;
}
case 1:

this.state=2;
if(!this.aborted&&this.ndata[2]&&(((val instanceof CFException)&&val.type=="t")||this.ndata[0]&1)){



var v;
if(this.ndata[0]&1){


v=(val instanceof CFException)?[val.val,true]:[val,false];
}else v=val.val;


val=this.ndata[2](this.env,v);


if(!this.NDATA_TRY_RETRACT_BLOCK&&!this.ndata[3])return this.returnToParent(val);



if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val);
return this;
}
}
case 2:

this.state=3;


this.rv=val;
if(this.aborted&&this.ndata[4]){
val=execIN(this.ndata[4],this.env);







if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val);
return this;
}
}
case 3:

this.state=4;
if(this.ndata[3]){
val=execIN(this.ndata[3],this.env);


if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val);
return this;
}
}
case 4:



if((this.rv instanceof CFException)&&!(val instanceof CFException)){
val=this.rv;
}
break;
default:
val=new CFException("i","invalid state in CF_Try");
}
return this.returnToParent(val);
}
};

EF_Try.prototype.quench=function(){if(this.state!=4)this.child_frame.quench();


};

EF_Try.prototype.abort=function(){this.parent=UNDEF;




this.aborted=true;

if(this.state!=4){
var val=this.child_frame.abort();
if(is_ef(val)){


this.setChildFrame(val);
}else{


if(cont(this,0,UNDEF)!=this)return;


}
}
return this;
};

function I_try(ndata,env){return cont(new EF_Try(ndata,env),0);

}

exports.Try=makeINCtor(I_try);













function EF_Loop(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_Loop.prototype={});

EF_Loop.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else{

while(true){

if(idx==0){
if((val instanceof CFException)){

return this.returnToParent(val);
}

val=execIN(this.ndata[1],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
if(!is_ef(val))return this.returnToParent(val);

}
}

if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,2);
return this;
}
idx=2;
}

if(idx>1){
if(idx==2){

if(!val||(val instanceof CFException)){

return this.returnToParent(val);
}
}
while(1){
if(idx>2){
if((val instanceof CFException)){
if(val.type=='blb'&&val.ef==this.env.blscope){

val=UNDEF;
}else{

if(val.type=="b"){

val=UNDEF;
}else if(val.type=="c"){


val=UNDEF;

break;
}
return this.returnToParent(val);
}
}
if(idx>=this.ndata.length)break;

}


this.child_frame=null;
val=execIN(this.ndata[idx+1],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
if(!is_ef(val))return this.returnToParent(val);

}
}
++idx;
if(is_ef(val)){
this.setChildFrame(val,idx);
return this;
}
}
idx=1;
}

if(this.ndata[2]){

val=execIN(this.ndata[2],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
if(!is_ef(val))return this.returnToParent(val);

}
}

if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,0);
return this;
}
}
idx=0;
}
}
};

function I_loop(ndata,env){return cont(new EF_Loop(ndata,env),ndata[0],true);

}

exports.Loop=makeINCtor(I_loop);













function EF_ForIn(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_ForIn.prototype={});

EF_ForIn.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else{

if(idx==0){
val=execIN(this.ndata[0],this.env);
if(this.aborted){

if(is_ef(val)){
val.quench();
val=val.abort();
if(!is_ef(val))return this.returnToParent(val);

}
}

if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,1);
return this;
}
idx=1;
}
if(idx==1){

if((val instanceof CFException))return this.returnToParent(val);

for(var x in val){
if(typeof this.remainingX==='undefined'){
val=this.ndata[1](this.env,x);
if((val instanceof CFException)){
if(val.type=="b"){

val=UNDEF;
}else if(val.type=="c"){


val=UNDEF;
continue;
}
return this.returnToParent(val);
}
if(is_ef(val))this.remainingX=[];

}else this.remainingX.push(x);


}
if(is_ef(val)){
if(!this.remainingX)this.remainingX=[];
this.child_frame=null;
this.setChildFrame(val,2);
return this;
}

return this.returnToParent(val);
}
if(idx==2){
while(1){

if((val instanceof CFException)){
if(val.type=="b"){

val=UNDEF;
}else if(val.type=="c"){


val=UNDEF;
if(this.remainingX.length)continue;

}
return this.returnToParent(val);
}
if(is_ef(val)){
this.child_frame=null;
this.setChildFrame(val,2);
return this;
}
if(!this.remainingX.length){
return this.returnToParent(val);
}
val=this.ndata[1](this.env,this.remainingX.shift());

}
}
}
};

function I_forin(ndata,env){return cont(new EF_ForIn(ndata,env),0);

}

exports.ForIn=makeINCtor(I_forin);












function EF_Par(ndata,env){this.ndata=ndata;

this.env=env;
this.pending=0;
this.children=new Array(this.ndata.length);
}
setEFProto(EF_Par.prototype={});

EF_Par.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else{

if(idx==-1){

for(var i=0;i<this.ndata.length;++i){
val=execIN(this.ndata[i],this.env);
if(this.aborted){


if(is_ef(val)){
++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
return this.pendingCFE;
}else if(is_ef(val)){

++this.pending;
this.setChildFrame(val,i);
}else if((val instanceof CFException)){


this.pendingCFE=val;
this.quench();
return this.abortInner();
}
}
}else{


--this.pending;
this.children[idx]=UNDEF;
if((val instanceof CFException)&&!this.aborted){

this.pendingCFE=val;
this.quench();
return this.returnToParent(this.abortInner());
}
}
if(this.pending<2){
if(!this.pendingCFE){


if(this.pending==0)return this.returnToParent(val);


for(var i=0;i<this.children.length;++i)if(this.children[i])return this.returnToParent(this.children[i]);


return this.returnToParent(new CFException("i","invalid state in Par"));
}else{



if(this.pending==0)return this.returnToParent(this.pendingCFE);

}
}
this.async=true;
return this;
}
};

EF_Par.prototype.quench=function(){if(this.aborted)return;

for(var i=0;i<this.children.length;++i){
if(this.children[i])this.children[i].quench();

}
};

EF_Par.prototype.abort=function(){this.parent=UNDEF;



if(this.aborted){


this.pendingCFE=UNDEF;
return this;
}
return this.abortInner();
};

EF_Par.prototype.abortInner=function(){this.aborted=true;




for(var i=0;i<this.children.length;++i)if(this.children[i]){

var val=this.children[i].abort();
if(is_ef(val))this.setChildFrame(val,i);else{


--this.pending;
this.children[i]=UNDEF;
}
}
if(!this.pending)return this.pendingCFE;


this.async=true;
return this;
};

EF_Par.prototype.setChildFrame=function(ef,idx){if(this.children[idx]&&this.children[idx].callstack){


mergeCallstacks(ef,this.children[idx]);
}
this.children[idx]=ef;
ef.parent=this;
ef.parent_idx=idx;
};

function I_par(ndata,env){return cont(new EF_Par(ndata,env),-1);

}

exports.Par=makeINCtor(I_par);












function EF_Alt(ndata,env){this.ndata=ndata;

this.env=env;

this.pending=0;
this.children=new Array(this.ndata.length);
}
setEFProto(EF_Alt.prototype={});

EF_Alt.prototype.cont=function(idx,val){if(is_ef(val)){

this.setChildFrame(val,idx);
}else{

if(idx==-1){

for(var i=0;i<this.ndata.length;++i){


var env=copyEnv(this.env);
env.fold=this;
env.branch=i;
val=execIN(this.ndata[i],env);

if(this.aborted){


if(is_ef(val)){
++this.pending;
this.setChildFrame(val,i);
this.quench();
return this.abortInner();
}
return this.pendingRV;
}else if(is_ef(val)){

++this.pending;
this.setChildFrame(val,i);
}else{


this.pendingRV=val;
this.quench();
return this.abortInner();
}
}
}else{


--this.pending;
this.children[idx]=UNDEF;
if(this.collapsing){


if(this.pending==1){

var cf=this.collapsing.cf;
this.collapsing=UNDEF;
cont(cf,1);
}
return;
}else{



if(!this.aborted){
this.pendingRV=val;
this.quench();
return this.returnToParent(this.abortInner());
}
if(this.pending==0)return this.returnToParent(this.pendingRV);

}
}
this.async=true;
return this;
}
};

EF_Alt.prototype.quench=function(except){if(this.aborted)return;

if(this.collapsing){

this.children[this.collapsing.branch].quench();
}else{


for(var i=0;i<this.children.length;++i){
if(i!==except&&this.children[i])this.children[i].quench();

}
}
};

EF_Alt.prototype.abort=function(){this.parent=UNDEF;

if(this.aborted){
this.pendingRV=UNDEF;
return this;
}
return this.abortInner();
};

EF_Alt.prototype.abortInner=function(){this.aborted=true;


if(this.collapsing){

var branch=this.collapsing.branch;
this.collapsing=UNDEF;
var val=this.children[branch].abort();
if(is_ef(val))this.setChildFrame(val,branch);else{


--this.pending;
this.children[branch]=UNDEF;
}
}else{


for(var i=0;i<this.children.length;++i)if(this.children[i]){

var val=this.children[i].abort();
if(is_ef(val))this.setChildFrame(val,i);else{


--this.pending;
this.children[i]=UNDEF;
}
}
}
if(!this.pending)return this.pendingRV;

this.async=true;
return this;
};

EF_Alt.prototype.setChildFrame=function(ef,idx){if(this.children[idx]&&this.children[idx].callstack){


mergeCallstacks(ef,this.children[idx]);
}
this.children[idx]=ef;
ef.parent=this;
ef.parent_idx=idx;
};

EF_Alt.prototype.docollapse=function(branch,cf){this.quench(branch);


for(var i=0;i<this.children.length;++i){
if(i==branch)continue;
if(this.children[i]){
var val=this.children[i].abort();
if(is_ef(val))this.setChildFrame(val,i);else{


--this.pending;
this.children[i]=UNDEF;
}
}
}

if(this.pending<=1)return true;




this.collapsing={branch:branch,cf:cf};
return false;
};

function I_alt(ndata,env){return cont(new EF_Alt(ndata,env),-1);

}

exports.Alt=makeINCtor(I_alt);




















function EF_Suspend(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_Suspend.prototype={});

EF_Suspend.prototype.cont=function(idx,val){if(is_ef(val)){


this.setChildFrame(val,idx);
}else{

switch(idx){case 0:

try{
var ef=this;

var resumefunc=function(){try{

cont(ef,2,arguments);
}catch(e){

var s=function(){throw e};
setTimeout(s,0);
}
};


val=this.ndata[0](this.env,resumefunc);
}catch(e){


val=new CFException("t",e);
}



if(this.returning){

if(is_ef(val)){


this.setChildFrame(val,null);
this.quench();
val=this.abort();
if(is_ef(val)){

this.setChildFrame(val,3);

this.async=true;
return this;
}

}
return cont(this,3,null);
}

if(is_ef(val)){
this.setChildFrame(val,1);
return this;
}
case 1:

if((val instanceof CFException)){
this.returning=true;
break;
}
this.suspendCompleted=true;

this.async=true;
return this;
case 2:



if(this.returning){

return;
}
this.returning=true;
if((val instanceof CFException)){


val=new CFException("i","Suspend: Resume function threw ("+val.toString()+")");
break;
}
this.retvals=val;
if(!this.suspendCompleted){

if(!this.child_frame){



this.returning=true;
return;
}else{

this.quench();
val=this.abort();
if(is_ef(val)){

this.setChildFrame(val,3);
return this;
}


}
}
case 3:

try{
this.ndata[1].apply(this.env,this.retvals);
val=UNDEF;
}catch(e){

val=new CFException("i","Suspend: Return function threw ("+e+")");
}
break;
default:
val=new CFException("i","Invalid state in Suspend ("+idx+")");
}
return this.returnToParent(val);
}
};

EF_Suspend.prototype.quench=function(){this.returning=true;

if(!this.suspendCompleted)this.child_frame.quench();

};

EF_Suspend.prototype.abort=function(){this.returning=true;


if(!this.suspendCompleted)return this.child_frame.abort();

};

function I_sus(ndata,env){return cont(new EF_Suspend(ndata,env),0);

}

exports.Suspend=makeINCtor(I_sus);










function EF_Spawn(ndata,env,notifyAsync,notifyVal){this.ndata=ndata;

this.env=env;
this.notifyAsync=notifyAsync;
this.notifyVal=notifyVal;
}
setEFProto(EF_Spawn.prototype={});

EF_Spawn.prototype.cont=function(idx,val){if(idx==0)val=execIN(this.ndata[1],this.env);



if(is_ef(val)){
this.setChildFrame(val,1);
if(idx==0)this.notifyAsync();

}else{

this.notifyVal(val);
}
};

function EF_SpawnWaitFrame(waitarr){this.waitarr=waitarr;

waitarr.push(this);
}
setEFProto(EF_SpawnWaitFrame.prototype={});
EF_SpawnWaitFrame.prototype.quench=function(){};
EF_SpawnWaitFrame.prototype.abort=function(){var idx=this.waitarr.indexOf(this);

this.waitarr.splice(idx,1);
};
EF_SpawnWaitFrame.prototype.cont=function(val){if(this.parent)cont(this.parent,this.parent_idx,val);


};

function I_spawn(ndata,env){var val,async,have_val,picked_up=false;

var waitarr=[];
var stratum={abort:function(){
if(!async)return;

ef.quench();
ef.abort();
async=false;
val=new CFException("t",new Error("stratum aborted"),ndata[0],env.file);



while(waitarr.length)cont(waitarr.shift(),val);

},value:function(){
if(!async){
picked_up=true;return val}
return new EF_SpawnWaitFrame(waitarr);
},waitforValue:function(){

return this.value()},running:function(){
return async},waiting:function(){
return waitarr.length;

},toString:function(){
return "[object Stratum]"}};


function notifyAsync(){async=true;

}
function notifyVal(_val){val=_val;

async=false;
if(!waitarr.length){





if((val instanceof CFException)&&(val.type!='t'||val.val instanceof Error)){










setTimeout(function(){if(!picked_up)val.mapToJS(true);







},0);

}
}else while(waitarr.length)cont(waitarr.shift(),val);




}
var ef=new EF_Spawn(ndata,env,notifyAsync,notifyVal);
cont(ef,0);
return stratum;
}

exports.Spawn=makeINCtor(I_spawn);










function EF_Collapse(ndata,env){this.ndata=ndata;

this.env=env;
}
setEFProto(EF_Collapse.prototype={});


EF_Collapse.prototype.__oni_collapse=true;

EF_Collapse.prototype.cont=function(idx,val){if(idx==0){

var fold=this.env.fold;
if(!fold)return new CFException("t",new Error("Unexpected collapse statement"),this.ndata[0],this.env.file);


if(fold.docollapse(this.env.branch,this))return true;


this.async=true;
return this;
}else if(idx==1)return this.returnToParent(true);else return this.returnToParent(new CFException("t","Internal error in SJS runtime (collapse)",this.ndata[0],this.env.file));





};


EF_Collapse.prototype.quench=function(){};
EF_Collapse.prototype.abort=function(){};

function I_collapse(ndata,env){return cont(new EF_Collapse(ndata,env),0);

}

exports.Collapse=makeINCtor(I_collapse);




function dummy(){}

exports.Hold=function(){if(!arguments.length)return {__oni_ef:true,quench:dummy,abort:dummy};


var sus={__oni_ef:true,abort:dummy,quench:function(){

sus=null;clearTimeout(this.co)}};

sus.co=setTimeout(function(){if(sus&&sus.parent)cont(sus.parent,sus.parent_idx,UNDEF)},arguments[0]);

return sus;
};

exports.Throw=function(exp,line,file){return new CFException("t",exp,line,file)};

exports.Arr=function(){return Array.prototype.slice.call(arguments,0)};

exports.Obj=function(){var obj=new Object();



for(var i=0;i<arguments[0].length;++i)obj[arguments[0][i]]=arguments[i+1];

return obj;
};

function QuasiProto(parts){this.parts=parts}
exports.QuasiProto=QuasiProto;

exports.Quasi=function(){return new QuasiProto(Array.prototype.slice.call(arguments,0));

};

exports.Return=function(exp){return new CFException("r",exp);

};

exports.Break=function(lbl){return new CFException("b",lbl);

};

exports.Cont=function(lbl){return new CFException("c",lbl);

};

exports.BlBreak=function(env,lbl){var e=new CFException('blb',lbl);

if(!env.blref)throw new Error("Internal runtime error; no reference frame in BlBreak");
if(env.blref.unreturnable&&!env.blref.toplevel)throw new Error("Blocklambda break to inactive scope");

e.ef=env.blref;
return e;
};

exports.BlReturn=function(exp){var e=new CFException('r',exp);

if(!this.blref)throw new Error("Internal runtime error; no reference frame in BlReturn");
if(this.blref.unreturnable){
if(this.blref.toplevel)throw new Error("Invalid blocklambda 'return' statement; 'return' is only allowed in blocklambdas that are nested in functions");else{



throw new Error("Blocklambda return to inactive function");
}
}
e.ef=this.blref;
return e;
};

exports.With=function(exp,bodyf){return bodyf(this,exp);

};

exports.join_str=function(){var rv='';

for(var i=0,l=arguments.length;i<l;++i)rv+=arguments[i];

return rv;
};

exports.infix={'+':function(a,b){
return a+b},'-':function(a,b){
return a-b},'*':function(a,b){
return a*b},'/':function(a,b){
return a/b},'%':function(a,b){
return a%b},'<<':function(a,b){
return a<<b},'>>':function(a,b){
return a>>b},'>>>':function(a,b){
return a>>>b},'<':function(a,b){
return a<b},'>':function(a,b){
return a>b},'<=':function(a,b){
return a<=b},'>=':function(a,b){
return a>=b},'==':function(a,b){
return a==b},'!=':function(a,b){
return a!=b},'===':function(a,b){
return a===b},'!==':function(a,b){
return a!==b},'&':function(a,b){
return a&b},'^':function(a,b){
return a^b},'|':function(a,b){
return a|b},',':function(a,b){
return a,b},'instanceof':function(a,b){

return a instanceof b},'in':function(a,b){
return a in b}};




var UA=navigator.userAgent.toLowerCase();
if(UA.indexOf(" chrome/")>=0)UA="chrome";else if(UA.indexOf(" firefox/")>=0)UA="firefox";else if(UA.indexOf(" safari/")>=0)UA="safari";else if(UA.indexOf(" msie ")>=0)UA="msie";else UA="unknown";









exports.hostenv="xbrowser";
exports.UA=UA;

exports.G=window;

exports.modules={};exports.modsrc={};})(__oni_rt);(function(exports){function push_decl_scope(pctx,bl){






















































































































































































































































































































































pctx.decl_scopes.push({vars:[],funs:"",fscoped_ctx:0,bl:bl,continue_scope:0,break_scope:0});


if(bl){
var prev=pctx.decl_scopes[pctx.decl_scopes.length-2];
if(!prev.bl)prev.notail=true;

}
}

function collect_decls(decls){var rv="";

if(decls.vars.length)rv+="var "+decls.vars.join(",")+";";

rv+=decls.funs;
return rv;
}

function top_decl_scope(pctx){return pctx.decl_scopes[pctx.decl_scopes.length-1];

}

function push_stmt_scope(pctx){pctx.stmt_scopes.push({seq:[]});

}
function pop_stmt_scope(pctx,pre,post){var seq=pctx.stmt_scopes.pop().seq;

var rv="";
if(seq.length){
if(pctx.js_ctx==0){
if(pre)rv+=pre;

for(var i=0;i<seq.length;++i){
var v=seq[i].v();
;
if(v.length){
if(i||pre)rv+=",";
rv+=v;
}
}
if(post)rv+=post;

}else{


for(var i=0;i<seq.length;++i)rv+=seq[i].nb();

}
}
return rv;
}

function top_stmt_scope(pctx){return pctx.stmt_scopes[pctx.stmt_scopes.length-1];

}









function begin_script(pctx){switch(pctx.mode){case "debug":



pctx.allow_nblock=false;
pctx.full_nblock=false;
break;
case "optimize":
pctx.allow_nblock=true;
pctx.full_nblock=true;
break;
case "normal":
default:
pctx.allow_nblock=true;
pctx.full_nblock=false;
}

if(typeof pctx.scopes!=='undefined')throw new Error("Internal parser error: Nested script");


pctx.decl_scopes=[];



pctx.stmt_scopes=[];

pctx.js_ctx=0;

push_decl_scope(pctx);
push_stmt_scope(pctx);
}



function add_stmt(stmt,pctx){if(stmt==ph_empty_stmt)return;

if(stmt.is_compound_stmt){

for(var i=0;i<stmt.stmts.length;++i)add_stmt(stmt.stmts[i],pctx);

return;
}else if(stmt.is_var_decl){

stmt.collect_var_decls(top_decl_scope(pctx).vars);
if(stmt.is_empty)return;


}else if(stmt.is_fun_decl){

top_decl_scope(pctx).funs+=stmt.fun_decl();
return;
}


var seq=top_stmt_scope(pctx).seq;
if(stmt.is_nblock&&pctx.js_ctx==0){

var last=seq.length?seq[seq.length-1]:null;
if(!last||!last.is_nblock_seq){
last=new ph_nblock_seq(pctx);
seq.push(last);
}
last.pushStmt(stmt);
}else seq.push(stmt);


}

function end_script(pctx){var decls=pctx.decl_scopes.pop();

var rv=collect_decls(decls)+pop_stmt_scope(pctx,(pctx.globalReturn?"return ":"")+"__oni_rt.exseq(this.arguments,this,"+pctx.filename+",["+(16|8),"])");




return rv;
}







function pop_block(pctx){switch(top_stmt_scope(pctx).seq.length){case 1:


var stmt=pctx.stmt_scopes.pop().seq[0];

stmt.is_var_decl=false;
return stmt;
case 0:
pctx.stmt_scopes.pop();
return ph_empty_stmt;
default:
return new ph_block(pop_stmt_scope(pctx));
}
}









function nblock_val_to_val(v,r,l){var rv="__oni_rt.Nb(function(){";

if(r)rv+="return ";
return rv+v+"},"+(l||0)+")";
}

function ph(){}

ph.prototype={is_nblock:false,v:function(accept_list){


if(this.is_nblock&&this.nblock_val)return nblock_val_to_val(this.nblock_val(),this.is_value,this.line);else return this.val(accept_list);




},nb:function(){

if(this.nblock_val)return this.nblock_val();else throw new Error("Illegal statement in __js block");






}};





function ph_block(seq){this.seq=seq;

}
ph_block.prototype=new ph();
ph_block.prototype.nblock_val=function(){return this.seq;

};
ph_block.prototype.val=function(accept_list){return this.seq.length?(accept_list?this.seq:"__oni_rt.Seq("+0+","+this.seq+")"):"0";




};




function ph_switch(exp,clauses){this.exp=exp;

this.clauses=clauses;
}
ph_switch.prototype=new ph();
ph_switch.prototype.nblock_val=function(){var rv="switch("+this.exp.nb()+"){";


for(var i=0,l=this.clauses.length;i<l;++i){
var clause=this.clauses[i];
rv+=(clause[0]?"case "+clause[0].nb()+":":"default:")+clause[1].nb();
}
return rv+"}";
};
ph_switch.prototype.val=function(){var clauses="[";


for(var i=0,l=this.clauses.length;i<l;++i){
var clause=this.clauses[i];
if(i)clauses+=",";
clauses+="["+(clause[0]?clause[0].v():"__oni_rt.Default")+","+clause[1].v()+"]";
}
clauses+="]";
return "__oni_rt.Switch("+this.exp.v()+","+clauses+")";
};







function ph_fun_exp(fname,pars,body,pctx,implicit_return){this.is_nblock=pctx.allow_nblock;






if(implicit_return&&pctx.js_ctx)body="return "+body;

















this.code="function "+fname+gen_function_header(pars)+body+"}";
}
ph_fun_exp.prototype=new ph();

ph_fun_exp.prototype.v=function(){return this.code;

};
ph_fun_exp.prototype.nblock_val=function(){return this.code};

function gen_fun_decl(fname,pars,body,pctx){if(top_decl_scope(pctx).fscoped_ctx){



return gen_var_decl([[new ph_identifier(fname,pctx),new ph_fun_exp("",pars,body,pctx)]],pctx);
}else return new ph_fun_decl(fname,pars,body,pctx);


}

function ph_fun_decl(fname,pars,body,pctx){this.code="function "+fname+gen_function_header(pars)+body+"}";

}
ph_fun_decl.prototype=new ph();
ph_fun_decl.prototype.is_fun_decl=true;

ph_fun_decl.prototype.fun_decl=function(){return this.code};






function ph_nblock_seq(){this.stmts=[];

}
ph_nblock_seq.prototype=new ph();
ph_nblock_seq.prototype.is_nblock=true;
ph_nblock_seq.prototype.is_nblock_seq=true;
ph_nblock_seq.prototype.pushStmt=function(stmt){this.stmts.push(stmt);

if(typeof this.line==='undefined')this.line=this.stmts[0].line;
};














ph_nblock_seq.prototype.nblock_val=function(){var rv="";

for(var i=0;i<this.stmts.length-1;++i){
rv+=this.stmts[i].nb();
}
if(this.stmts[i].is_value)rv+="return ";

rv+=this.stmts[i].nb();
return rv;
};


function ph_compound_stmt(pctx){this.stmts=[];

this.pctx=pctx;
}
ph_compound_stmt.prototype=new ph();
ph_compound_stmt.prototype.is_compound_stmt=true;
ph_compound_stmt.prototype.toBlock=function(){push_stmt_scope(this.pctx);

add_stmt(this,this.pctx);
return pop_block(this.pctx);
};

function ph_exp_stmt(exp,pctx){this.exp=exp;

this.line=this.exp.line;
this.is_nblock=exp.is_nblock;
}
ph_exp_stmt.prototype=new ph();
ph_exp_stmt.prototype.is_value=true;
ph_exp_stmt.prototype.nblock_val=function(){return this.exp.nb()+";"};
ph_exp_stmt.prototype.v=function(accept_list){return this.exp.v(accept_list)};


function gen_var_compound(decls,pctx){var rv=new ph_compound_stmt(pctx);

for(var i=0;i<decls.length;++i)rv.stmts.push(new ph_var_decl(decls[i],pctx));

return rv;
}

function gen_var_decl(decls,pctx){return gen_var_compound(decls,pctx).toBlock();

}

function ph_var_decl(d,pctx){this.d=d;

if(!this.d[0].is_id)this.is_dest=true;

this.is_empty=this.d.length<2;
this.pctx=pctx;
this.line=pctx.line;
if(!this.is_empty)this.is_nblock=pctx.allow_nblock&&d[1].is_nblock&&!this.is_dest;


}
ph_var_decl.prototype=new ph();
ph_var_decl.prototype.is_var_decl=true;
ph_var_decl.prototype.collect_var_decls=function(vars){try{

this.d[0].collect_var_decls(vars);
}catch(e){

throw new Error("Invalid syntax in variable declaration");
}
};
ph_var_decl.prototype.nblock_val=function(){return this.d[0].name+"="+this.d[1].nb()+";";


};
ph_var_decl.prototype.val=function(){if(this.is_dest){



return (new ph_assign_op(this.d[0],'=',this.d[1],this.pctx)).val();
}else return "__oni_rt.Sc("+this.line+",function(_oniX){return "+this.d[0].name+"=_oniX;},"+this.d[1].v()+")";




};

function ph_if(t,c,a,pctx){this.t=t;

this.c=c;
this.a=a;
this.line=t.line;
this.file=pctx.filename;

this.is_nblock=pctx.full_nblock&&t.is_nblock&&c.is_nblock&&(!a||a.is_nblock);

}
ph_if.prototype=new ph();
ph_if.prototype.nblock_val=function(){var rv="if("+this.t.nb()+"){"+this.c.nb()+"}";

if(this.a)rv+="else{"+this.a.nb()+"}";

return rv;
};

ph_if.prototype.val=function(){var rv;

var c=this.c.v();
if(this.t.is_nblock){

rv="__oni_rt.Nb(function(){if("+this.t.nb()+")return __oni_rt.ex("+c+",this);";

if(this.a)rv+="else return __oni_rt.ex("+this.a.v()+",this);";

return rv+"},"+this.line+")";
}else{


rv="__oni_rt.If("+this.t.v()+","+c;
if(this.a)rv+=","+this.a.v();

return rv+")";
}
};





function ph_try(block,crf,pctx){this.block=block;

this.crf=crf;
this.file=pctx.filename;
}
ph_try.prototype=new ph();
ph_try.prototype.nblock_val=function(){var rv="try{"+this.block.nb()+"}";


if(this.crf[0]){
if(this.crf[0][2])throw new Error("catchall statement not allowed in __js block");
rv+="catch("+this.crf[0][0]+"){"+this.crf[0][1].nb()+"}";
}
if(this.crf[1])throw new Error("retract statement not allowed in __js block");
if(this.crf[2])rv+="finally{"+this.crf[2].nb()+"}";

return rv;
};
ph_try.prototype.val=function(){var tb=this.block.v();

var rv="__oni_rt.Try("+((this.crf[0]&&this.crf[0][2])?1:0);
rv+=","+tb;
if(this.crf[0]){
var cb=this.crf[0][1].v();
rv+=",function(__oni_env,"+this.crf[0][0]+"){";
if(cb.length)rv+="return __oni_rt.ex("+cb+",__oni_env)";

rv+="}";
}else rv+=",0";



if(this.crf[2]){
var fb=this.crf[2].v();
rv+=","+fb;
}else rv+=",0";



if(this.crf[1]){
var rb=this.crf[1].v();
rv+=","+rb;
}
return rv+")";
};

var ph_empty_stmt=new ph();
ph_empty_stmt.is_nblock=true;
ph_empty_stmt.nblock_val=function(){return ';'};
ph_empty_stmt.v=function(){return '0'};

function ph_throw(exp,pctx){this.exp=exp;

this.line=exp.line;
this.file=pctx.filename;
this.is_nblock=pctx.full_nblock&&exp.is_nblock;
}
ph_throw.prototype=new ph();
ph_throw.prototype.nblock_val=function(){return "throw "+this.exp.nb()+";";

};
ph_throw.prototype.val=function(){return "__oni_rt.Sc("+this.line+",__oni_rt.Throw,"+this.exp.v()+","+this.line+","+this.file+")";



};


function ph_bl_return(exp,pctx){this.line=pctx.line;

this.exp=exp;
}
ph_bl_return.prototype=new ph();
ph_bl_return.prototype.val=function(){var v=this.exp?","+this.exp.v():"";

return "__oni_rt.Sc("+this.line+",__oni_rt.BlReturn"+v+")";
};



function ph_return(exp,pctx){this.line=pctx.line-pctx.newline;


this.exp=exp;

this.js_ctx=pctx.js_ctx;
this.is_nblock=pctx.allow_nblock&&(exp?exp.is_nblock:true);
}
ph_return.prototype=new ph();
ph_return.prototype.nblock_val=function(){var rv;

if(this.js_ctx){

rv="return";
if(this.exp)rv+=" "+this.exp.nb();
rv+=";";
}else{


rv="return __oni_rt.Return(";
if(this.exp)rv+=this.exp.nb();
rv+=");";
}
return rv;
};
ph_return.prototype.val=function(){var v=this.exp?","+this.exp.v():"";

return "__oni_rt.Sc("+this.line+",__oni_rt.Return"+v+")";
};


function ph_collapse(pctx){this.line=pctx.line;

}
ph_collapse.prototype=new ph();
ph_collapse.prototype.val=function(){return "__oni_rt.Collapse("+this.line+")";

};




function ph_cfe(f,pctx,lbl){this.f=f;

this.lbl=lbl;
this.is_nblock=true;

this.js_ctx=pctx.js_ctx;
}
ph_cfe.prototype=new ph();
ph_cfe.prototype.nblock_val=function(){var rv;

if(this.js_ctx){


rv=(this.f=="b"?"break":"continue");
if(this.lbl)rv+=" "+this.lbl;
rv+=";";
}else{


rv="return __oni_rt."+(this.f=="b"?"Break":"Cont")+"(";
if(this.lbl)rv+="'"+this.lbl+"'";
rv+=");";
}
return rv;
};

function ph_bl_break(pctx,lbl){this.line=pctx.line;

this.lbl=lbl;
this.is_nblock=true;
}
ph_bl_break.prototype=new ph();
ph_bl_break.prototype.nblock_val=function(){if(this.js_ctx)throw new Error("Blocklamdas cannot contain 'break' statements in __js{...} contexts");

var rv="return __oni_rt.BlBreak(this";
if(this.lbl)rv+=",'"+this.lbl+"'";
rv+=");";
return rv;
};



function gen_for(init_exp,decls,test_exp,inc_exp,body,pctx){var rv;

if(init_exp||decls){
if(decls)rv=gen_var_compound(decls,pctx);else rv=new ph_compound_stmt(pctx);



if(init_exp)rv.stmts.push(new ph_exp_stmt(init_exp,pctx));

rv.stmts.push(new ph_loop(0,test_exp,body,inc_exp));

rv=rv.toBlock();
}else rv=new ph_loop(0,test_exp,body,inc_exp);


return rv;
}




function ph_loop(init_state,test_exp,body,inc_exp){this.init_state=init_state;

this.test_exp=test_exp;
this.inc_exp=inc_exp;
this.body=body;
}
ph_loop.prototype=new ph();
ph_loop.prototype.nblock_val=function(){if(this.init_state==2){



return "do{"+this.body.nb()+"}while("+this.test_exp.nb()+");";
}else if(this.test_exp&&this.inc_exp){

return "for(;"+this.test_exp.nb()+";"+this.inc_exp.nb()+"){"+this.body.nb()+"}";

}else if(this.test_exp){


return "while("+this.test_exp.nb()+"){"+this.body.nb()+"}";
}else throw new Error("Can't encode this loop as __js yet");

};
ph_loop.prototype.val=function(){var test=this.test_exp?this.test_exp.v():"1";


var body=this.body.v(true);
return "__oni_rt.Loop("+this.init_state+","+test+","+(this.inc_exp?this.inc_exp.v():"0")+","+body+")";

};



function gen_for_in(lhs_exp,decl,obj_exp,body,pctx){var rv;

if(decl){
rv=gen_var_compound([decl],pctx);
rv.stmts.push(new ph_for_in(decl[0],obj_exp,body,pctx));


rv=rv.toBlock();
}else rv=new ph_for_in(lhs_exp,obj_exp,body,pctx);


return rv;
}

function ph_for_in(lhs,obj,body,pctx){this.lhs=lhs;

this.obj=obj;
this.body=body;
this.pctx=pctx;
}
ph_for_in.prototype=new ph();
ph_for_in.prototype.nblock_val=function(){return "for("+this.lhs.nb()+" in "+this.obj.nb()+"){"+this.body.nb()+"}";


};
ph_for_in.prototype.val=function(){var rv="__oni_rt.ForIn("+this.obj.v();

rv+=",function(__oni_env, _oniY) { return __oni_rt.ex(__oni_rt.Seq("+0+",";

rv+=(new ph_assign_op(this.lhs,"=",new ph_identifier("_oniY",this.pctx),this.pctx)).v();


if(this.body)rv+=","+this.body.v();

return rv+"), __oni_env)})";
};

function ph_with(exp,body,pctx){this.exp=exp;

this.body=body;
this.line=this.exp.line;
this.file=pctx.filename;
this.is_nblock=pctx.allow_nblock&&exp.is_nblock&&body.is_nblock;
}
ph_with.prototype=new ph();
ph_with.prototype.nblock_val=function(){return "with("+this.exp.nb()+")"+this.body.nb()};
ph_with.prototype.val=function(){var rv="__oni_rt.Sc("+this.line+",__oni_rt.With,"+this.exp.v()+",function(__oni_env,__oni_z){with(__oni_z) return __oni_rt.ex("+this.body.v()+",__oni_env)})";





return rv;
};





function ph_literal(value,pctx,type){this.value=value;

this.line=pctx.line;
}
ph_literal.prototype=new ph();
ph_literal.prototype.is_nblock=true;

ph_literal.prototype.v=function(){return this.value};
ph_literal.prototype.nblock_val=function(){return this.value};
ph_literal.prototype.destruct=function(){if(this.value!="")throw new Error("invalid pattern");return ""};
ph_literal.prototype.collect_var_decls=function(){};

function ph_infix_op(left,id,right,pctx){this.left=left;


this.id=id;
this.right=right;
this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&left.is_nblock&&right.is_nblock;
}
ph_infix_op.prototype=new ph();
ph_infix_op.prototype.is_value=true;

ph_infix_op.prototype.collect_pars=function(pars){if(this.id!=',')throw new Error("invalid parameter list syntax");

pars.push(this.left);
if(this.right.collect_pars)this.right.collect_pars(pars);else pars.push(this.right);



};

ph_infix_op.prototype.nblock_val=function(){return this.left.nb()+" "+this.id+" "+this.right.nb();

};
ph_infix_op.prototype.val=function(){if(this.is_nblock){



return nblock_val_to_val(this.nb(),true,this.line);
}else if(this.id=="||"){


return "__oni_rt.Seq("+2+","+this.left.v()+","+this.right.v()+")";
}else if(this.id=="&&"){


return "__oni_rt.Seq("+4+","+this.left.v()+","+this.right.v()+")";
}else return "__oni_rt.Sc("+this.line+",__oni_rt.infix['"+this.id+"'],"+this.left.v()+","+this.right.v()+")";


};


function ph_interpolating_str(parts,pctx){this.is_nblock=pctx.allow_nblock;

this.line=pctx.line;
this.parts=parts;
for(var i=0,l=parts.length;i<l;++i){
if(Array.isArray(parts[i])&&!parts[i][0].is_nblock){
this.is_nblock=false;
break;
}
}
}
ph_interpolating_str.prototype=new ph();
ph_interpolating_str.prototype.is_value=true;
ph_interpolating_str.prototype.nblock_val=function(){for(var i=0,l=this.parts.length;i<l;++i){

var p=this.parts[i];
if(Array.isArray(p)){
this.parts[i]="("+p[0].nb()+")";
}else{

this.parts[i]='"'+p+'"';
}
}
return '('+this.parts.join('+')+')';
};
ph_interpolating_str.prototype.val=function(){if(this.is_nblock)return nblock_val_to_val(this.nb(),true,this.line);

for(var i=0,l=this.parts.length;i<l;++i){
var p=this.parts[i];
if(Array.isArray(p)){
this.parts[i]=p[0].v();
}else{

this.parts[i]='"'+p+'"';
}
}
return '__oni_rt.Sc('+this.line+',__oni_rt.join_str,'+this.parts.join(',')+')';
};


function ph_quasi_template(parts,pctx){this.parts=parts;

this.line=pctx.line;
this.is_nblock=false;
}
ph_quasi_template.prototype=new ph();
ph_quasi_template.prototype.is_value=true;
ph_quasi_template.prototype.val=function(){var rv="__oni_rt.Sc("+this.line+",__oni_rt.Quasi";

for(var i=0;i<this.parts.length;++i){
if(i%2)rv+=","+this.parts[i].v();else rv+=',"'+this.parts[i].replace(/\"/g,'\\"')+'"';



}
return rv+")";
};

function ph_assign_op(left,id,right,pctx){if(!left.is_ref&&!left.is_id){


this.is_dest=true;
if(id!="=")throw new Error("Invalid operator in destructuring assignment");
}
this.left=left;
this.id=id;
this.right=right;
this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&left.is_nblock&&right.is_nblock&&!this.is_dest;

}
ph_assign_op.prototype=new ph();
ph_assign_op.prototype.is_value=true;
ph_assign_op.prototype.nblock_val=function(){return this.left.nb()+this.id+this.right.nb();

};
ph_assign_op.prototype.val=function(){var rv;

if(this.is_nblock){
rv=nblock_val_to_val(this.nb(),true,this.line);
}else if(this.is_dest){

rv="__oni_rt.Sc("+this.line+",function(_oniX";
try{
var drefs=[],body=this.left.destruct("_oniX",drefs);
for(var i=1;i<=drefs.length;++i)rv+=",_oniX"+i;

rv+="){"+body+"},"+this.right.v();
for(var i=0;i<drefs.length;++i)rv+=","+drefs[i];

rv+=")";
}catch(e){

throw {mes:"Invalid left side in destructuring assignment ",line:this.line};

}
}else if(!this.left.is_ref||this.left.is_nblock){




rv="__oni_rt.Sc("+this.line+",function(_oniX){return "+this.left.nb()+this.id+"_oniX;},"+this.right.v()+")";


}else{


rv="__oni_rt.Sc("+this.line+",function(l, r){return l[0][l[1]]"+this.id+"r;},"+this.left.ref()+","+this.right.v()+")";

}
return rv;
};

function ph_prefix_op(id,right,pctx){this.id=id;

this.right=right;
this.line=pctx.line;
this.is_nblock=(pctx.allow_nblock&&right.is_nblock)&&id!="spawn";
}
ph_prefix_op.prototype=new ph();
ph_prefix_op.prototype.is_value=true;
ph_prefix_op.prototype.nblock_val=function(){return this.id+" "+this.right.nb();

};
ph_prefix_op.prototype.val=function(){var rv;

if(this.id=="spawn")rv="__oni_rt.Spawn("+this.line+","+this.right.v()+")";else if(this.right.is_nblock){





rv=nblock_val_to_val(this.nb(),true,this.line);
}else if(this.right.is_ref){
rv="__oni_rt.Sc("+this.line+",function(r){return "+this.id+" r[0][r[1]]},"+this.right.ref()+")";

}else{


rv="__oni_rt.Sc("+this.line+",function(r){return "+this.id+" r},"+this.right.v()+")";

}
return rv;
};

function ph_postfix_op(left,id,pctx){if(!left.is_ref&&!left.is_id)throw new Error("Invalid argument for postfix op '"+id+"'");

this.left=left;
this.id=id;
this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&left.is_nblock;
}
ph_postfix_op.prototype=new ph();
ph_postfix_op.prototype.is_value=true;
ph_postfix_op.prototype.nblock_val=function(){return this.left.nb()+this.id+" "};
ph_postfix_op.prototype.val=function(){var rv;

if(this.left.is_nblock){

rv=nblock_val_to_val(this.nb(),true,this.line);
}else if(this.left.is_ref){

rv="__oni_rt.Sc("+this.line+",function(l){return l[0][l[1]]"+this.id+"},"+this.left.ref()+")";

}
return rv;
};



function gen_function_header(pars){var code="";






var trivial=true;
var vars=[];
if(!pars.length)return "(){";

var assignments="";

try{
for(var i=0;i<pars.length;++i){
if(trivial&&!(pars[i] instanceof ph_identifier))trivial=false;


pars[i].collect_var_decls(vars);
assignments+=pars[i].destruct('arguments['+i+']');
}

if(trivial){

return "("+vars.join(",")+"){";
}

if(vars.length){
code+="var "+vars.join(',')+";";
}

code+=assignments;
return '(){'+code;
}catch(e){
throw new Error("Invalid syntax in parameter list");
}

}




function ph_arrow(pars_exp,body,pctx,bound){this.is_nblock=pctx.allow_nblock;

this.js_ctx=pctx.js_ctx;
this.line=pctx.line;
this.bound=bound;

this.code='function';

var pars=[];
if(pars_exp){
if(pars_exp.collect_pars)pars_exp.collect_pars(pars);else pars.push(pars_exp);



}

this.code+=gen_function_header(pars);

if(pctx.js_ctx){
this.code+="return "+body.nb()+"}";
}else{

this.code+='return __oni_rt.exseq(arguments,this,'+pctx.filename+',['+(1+32)+','+body.v()+'])}';



}
}
ph_arrow.prototype=new ph();

ph_arrow.prototype.v=function(){if(this.bound)return nblock_val_to_val(this.nb(),true,this.line);else return this.code;




};

ph_arrow.prototype.nb=function(){if(this.bound)return '('+this.code+').bind('+(this.js_ctx?'this':'this.tobj')+')';else return this.code;




};



function gen_doubledot_call(l,r,pctx){if(r.is_fun_call){




r.args.unshift(l);


if(!r.is_nblock)r.nblock_form=false;
return r;
}else return new ph_fun_call(r,[l],pctx);


}



function gen_identifier(name,pctx){if(name=="hold"){




var rv=new ph_literal('__oni_rt.Hold',pctx);
rv.is_id=true;
return rv;
}else if(name=="arguments"){

return new ph_envobj('arguments','aobj',pctx);
}


return new ph_identifier(name,pctx);
}

function ph_identifier(name,pctx){this.name=name;

this.line=pctx.line;
}
ph_identifier.prototype=new ph();
ph_identifier.prototype.is_nblock=true;
ph_identifier.prototype.is_id=true;
ph_identifier.prototype.is_value=true;
ph_identifier.prototype.nblock_val=function(){return this.name};
ph_identifier.prototype.destruct=function(dpath){return this.name+"="+dpath+";";

};
ph_identifier.prototype.collect_var_decls=function(vars){vars.push(this.name);

};

function ph_envobj(name,ename,pctx){this.js_ctx=pctx.js_ctx;

this.line=pctx.line;
this.name=name;
this.ename=ename;
}
ph_envobj.prototype=new ph();
ph_envobj.prototype.is_nblock=true;
ph_envobj.prototype.is_id=true;
ph_envobj.prototype.is_value=true;
ph_envobj.prototype.nblock_val=function(){if(this.js_ctx)return this.name;else return "this."+this.ename;




};
ph_envobj.prototype.destruct=ph_envobj.prototype.collect_var_decls=function(){
throw new Error("'"+this.name+"' not allowed in destructuring pattern");

};






function is_nblock_arr(arr){for(var i=0;i<arr.length;++i)if(!arr[i].is_nblock)return false;


return true;
}

function ph_fun_call(l,args,pctx){this.l=l;

this.args=args;
this.nblock_form=l.is_nblock&&is_nblock_arr(args);
this.line=pctx.line;
}
ph_fun_call.prototype=new ph();
ph_fun_call.prototype.is_value=true;
ph_fun_call.prototype.is_fun_call=true;
ph_fun_call.prototype.nblock_val=function(){var rv=this.l.nb()+"(";



for(var i=0;i<this.args.length;++i){
if(i)rv+=",";
rv+=this.args[i].nb();
}
return rv+")";
};
ph_fun_call.prototype.val=function(){var rv;

if(this.nblock_form){
rv=this.l.nb()+"(";
for(var i=0;i<this.args.length;++i){
if(i)rv+=",";
rv+=this.args[i].nb();
}
return "__oni_rt.C(function(){return "+rv+")},"+this.line+")";
}else if(this.l.is_ref){

rv="__oni_rt.Fcall(1,"+this.line+","+this.l.ref();
}else{



rv="__oni_rt.Fcall(0,"+this.line+","+this.l.v();
}
for(var i=0;i<this.args.length;++i){
rv+=","+this.args[i].v();
}
rv+=")";
return rv;
};

function ph_dot_accessor(l,name,pctx){this.l=l;

this.name=name;
this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&l.is_nblock;
}
ph_dot_accessor.prototype=new ph();
ph_dot_accessor.prototype.is_ref=true;
ph_dot_accessor.prototype.is_value=true;
ph_dot_accessor.prototype.nblock_val=function(){return this.l.nb()+"."+this.name};
ph_dot_accessor.prototype.val=function(){return "__oni_rt.Sc("+this.line+",function(l){return l."+this.name+";},"+this.l.v()+")";


};
ph_dot_accessor.prototype.ref=function(){return "__oni_rt.Sc("+this.line+",function(l){return [l,'"+this.name+"'];},"+this.l.v()+")";



};
ph_dot_accessor.prototype.destruct=function(dpath,drefs){drefs.push(this.ref());

var v="_oniX"+drefs.length;
return v+"[0]["+v+"[1]]="+dpath+";";
};
ph_dot_accessor.prototype.collect_var_decls=function(vars){throw new Error("var declaration must not contain property accessor as lvalue");

};

function ph_idx_accessor(l,idxexp,pctx){this.l=l;

this.idxexp=idxexp;
this.line=pctx.line;

this.is_nblock=pctx.allow_nblock&&l.is_nblock&&idxexp.is_nblock;
}
ph_idx_accessor.prototype=new ph();
ph_idx_accessor.prototype.is_ref=true;
ph_idx_accessor.prototype.is_value=true;
ph_idx_accessor.prototype.nblock_val=function(){return this.l.nb()+"["+this.idxexp.nb()+"]";

};
ph_idx_accessor.prototype.val=function(){return "__oni_rt.Sc("+this.line+",function(l, idx){return l[idx];},"+this.l.v()+","+this.idxexp.v()+")";


};
ph_idx_accessor.prototype.ref=function(){if(this.is_nblock)return "__oni_rt.Nb(function(){return ["+this.l.nb()+","+this.idxexp.nb()+"]},"+this.line+")";else return "__oni_rt.Sc("+this.line+",function(l, idx){return [l, idx];},"+this.l.v()+","+this.idxexp.v()+")";






};


function ph_group(e,pctx){this.e=e;

this.is_nblock=pctx.allow_nblock&&e.is_nblock;
}
ph_group.prototype=new ph();
ph_group.prototype.is_value=true;
ph_group.prototype.nblock_val=function(){return "("+this.e.nb()+")"};
ph_group.prototype.v=function(accept_list){return this.e.v(accept_list)};
ph_group.prototype.destruct=function(dpath,drefs){return this.e.destruct(dpath,drefs)};
ph_group.prototype.collect_var_decls=function(vars){return this.e.collect_var_decls(vars)};
ph_group.prototype.collect_pars=function(pars){if(this.e.collect_pars)this.e.collect_pars(pars);else pars.push(this.e);




};

function ph_arr_lit(elements,pctx){this.elements=elements;

this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&is_nblock_arr(elements);

}
ph_arr_lit.prototype=new ph();
ph_arr_lit.prototype.is_value=true;
ph_arr_lit.prototype.nblock_val=function(){var rv="[";

for(var i=0;i<this.elements.length;++i){
if(i)rv+=",";
rv+=this.elements[i].nb();
}
return rv+"]";
};
ph_arr_lit.prototype.val=function(){var rv="__oni_rt.Sc("+this.line+",__oni_rt.Arr";

for(var i=0;i<this.elements.length;++i){
rv+=","+this.elements[i].v();
}
return rv+")";
};
ph_arr_lit.prototype.destruct=function(dpath,drefs){var rv="";

for(var i=0;i<this.elements.length;++i){
rv+=this.elements[i].destruct(dpath+"["+i+"]",drefs);
}
return rv;
};
ph_arr_lit.prototype.collect_var_decls=function(vars){for(var i=0;i<this.elements.length;++i)this.elements[i].collect_var_decls(vars);


};


function ph_obj_lit(props,pctx){this.props=props;

this.line=pctx.line;
this.is_nblock=pctx.allow_nblock&&(function(){for(var i=0;i<props.length;++i){


if(!props[i][2].is_nblock)return false;
}
return true;
})();


}
ph_obj_lit.prototype=new ph();
ph_obj_lit.prototype.is_value=true;
ph_obj_lit.prototype.nblock_val=function(){var rv="{";

for(var i=0;i<this.props.length;++i){
if(i!=0)rv+=",";



rv+=this.props[i][1]+":"+this.props[i][2].nb();
}
return rv+"}";
};

function quotedName(name){if(name.charAt(0)=="'"||name.charAt(0)=='"')return name;


return '"'+name+'"';
}

ph_obj_lit.prototype.val=function(){var rv="__oni_rt.Sc("+this.line+",__oni_rt.Obj, [";




for(var i=0;i<this.props.length;++i){
if(i)rv+=",";
if(this.props[i][0]=="pat")throw {mes:"Missing initializer for object property "+quotedName(this.props[i][1]),line:this.props[i][2]};


rv+=quotedName(this.props[i][1]);
}
rv+="]";
for(var i=0;i<this.props.length;++i){
rv+=","+this.props[i][2].v();
}
return rv+")";
};
ph_obj_lit.prototype.destruct=function(dpath,drefs){var rv="";

for(var i=0;i<this.props.length;++i){
var p=this.props[i];
if(p[0]=="pat"){
rv+=p[1]+"="+dpath+"."+p[1]+";";
}else rv+=p[2].destruct(dpath+"["+quotedName(p[1])+"]",drefs);


}
return rv;
};
ph_obj_lit.prototype.collect_var_decls=function(vars){for(var i=0;i<this.props.length;++i){

var p=this.props[i];
if(p[0]=="pat")vars.push(p[1]);else p[2].collect_var_decls(vars);



}
};


function ph_conditional(t,c,a,pctx){this.t=t;

this.c=c;
this.a=a;
this.line=t.line;
this.is_nblock=pctx.allow_nblock&&t.is_nblock&&c.is_nblock&&a.is_nblock;
}
ph_conditional.prototype=new ph();
ph_conditional.prototype.is_value=true;
ph_conditional.prototype.nblock_val=function(){return this.t.nb()+"?"+this.c.nb()+":"+this.a.nb();

};
ph_conditional.prototype.val=function(){return "__oni_rt.If("+this.t.v()+","+this.c.v()+","+this.a.v()+")";

};

function ph_new(exp,args){this.exp=exp;

this.args=args;
this.line=exp.line;
}
ph_new.prototype=new ph();
ph_new.prototype.is_value=true;
ph_new.prototype.nblock_val=function(){var rv="new "+this.exp.nb()+"(";


for(var i=0;i<this.args.length;++i){
if(i)rv+=",";
rv+=this.args[i].nb();
}
return rv+")";
};

ph_new.prototype.val=function(){var rv="__oni_rt.Fcall(2,"+this.line+","+this.exp.v();

for(var i=0;i<this.args.length;++i){
rv+=","+this.args[i].v();
}
rv+=")";
return rv;
};









function gen_waitfor_andor(op,blocks,crf,pctx){if(crf[0]||crf[1]||crf[2])return new ph_try(new ph_par_alt(op,blocks),crf,pctx);else return new ph_par_alt(op,blocks);




}

function ph_par_alt(op,blocks){this.op=op;

this.blocks=blocks;
}
ph_par_alt.prototype=new ph();
ph_par_alt.prototype.is_nblock=false;
ph_par_alt.prototype.val=function(){var rv="__oni_rt.";

if(this.op=="and")rv+="Par(";else rv+="Alt(";



for(var i=0;i<this.blocks.length;++i){
var b=this.blocks[i].v();
if(i)rv+=",";
rv+=b;
}
return rv+")";
};

function gen_suspend(has_var,decls,block,crf,pctx){var rv;

if(has_var){
rv=gen_var_compound(decls,pctx);
rv.stmts.push(gen_suspend_inner(decls,block,crf,pctx));

rv=rv.toBlock();
}else rv=gen_suspend_inner(decls,block,crf,pctx);


return rv;
}

function gen_suspend_inner(decls,block,crf,pctx){var wrapped=(crf[0]||crf[1]||crf[2]);



var rv=new ph_suspend(decls,block,wrapped,pctx);
if(wrapped)rv=new ph_suspend_wrapper((new ph_try(rv,crf,pctx)).v(),pctx);

return rv;
}

function ph_suspend(decls,block,wrapped,pctx){this.decls=decls;

this.block=block;
this.wrapped=wrapped;
this.file=pctx.filename;
}
ph_suspend.prototype=new ph();
ph_suspend.prototype.val=function(){var rv="__oni_rt.Suspend(function(__oni_env,";

if(this.wrapped)rv+="_oniX){resume=_oniX;";else rv+="resume){";



var b=this.block.v();
if(b.length)rv+="return __oni_rt.ex("+b+",__oni_env)";

rv+="}, function() {";
for(var i=0;i<this.decls.length;++i){
var name=this.decls[i][0].name;
if(name=="arguments")throw new Error("Cannot use 'arguments' as variable name in waitfor()");
rv+=name+"=arguments["+i+"];";
}
rv+="})";
return rv;
};


function ph_suspend_wrapper(code,pctx){this.code=code;

this.line=pctx.line;
this.file=pctx.filename;
}
ph_suspend_wrapper.prototype=new ph();
ph_suspend_wrapper.prototype.val=function(){return "__oni_rt.Nb(function(){var resume;"+"return __oni_rt.ex("+this.code+",this)},"+this.line+")";


};



function gen_using(has_var,lhs,exp,body,pctx){var rv;

if(has_var){

if(!lhs.is_id)throw new Error("Variable name expected in 'using' expression");
rv=gen_var_compound([[lhs]],pctx);
rv.stmts.push(new ph_using(lhs,exp,body,pctx));
rv=rv.toBlock();
}else rv=new ph_using(lhs,exp,body,pctx);


return rv;
}

function ph_using(lhs,exp,body,pctx){this.line=pctx.line;

this.body=body;
this.assign1=new ph_assign_op(new ph_identifier("_oniW",pctx),"=",exp,pctx);

if(lhs)this.assign2=new ph_assign_op(lhs,"=",new ph_identifier("_oniW",pctx),pctx);


}




ph_using.prototype=new ph();
ph_using.prototype.val=function(){var rv="__oni_rt.Nb(function(){var _oniW;"+"return __oni_rt.ex(__oni_rt.Seq("+0+","+this.assign1.v()+",";



if(this.assign2)rv+=this.assign2.v()+",";

rv+="__oni_rt.Try("+0+","+this.body.v()+",0,"+"__oni_rt.Nb(function(){if(_oniW&&_oniW.__finally__)return _oniW.__finally__()},"+this.line+"),0)),this)},"+this.line+")";

return rv;
};







function ph_blocklambda(pars,body,pctx){this.code="__oni_rt.Bl(function"+gen_function_header(pars)+body+"})";

}
ph_blocklambda.prototype=new ph();
ph_blocklambda.prototype.val=function(){return this.code};



function ph_lbl_stmt(lbl,stmt){this.lbl=lbl;

this.stmt=stmt;
}
ph_lbl_stmt.prototype=new ph();
ph_lbl_stmt.prototype.nblock_val=function(){return this.lbl+": "+this.stmt.nb();


};
ph_lbl_stmt.prototype.val=function(){throw new Error("labeled statements not implemented yet");


};








function Hash(){}
Hash.prototype={lookup:function(key){
return this["$"+key]},put:function(key,val){
this["$"+key]=val},del:function(key){
delete this["$"+key]}};
























var TOKENIZER_SA=/(?:[ \f\r\t\v\u00A0\u2028\u2029]+|\/\/.*|#!.*)*(?:((?:\n|\/\*(?:.|\n|\r)*?\*\/)+)|((?:0[xX][\da-fA-F]+)|(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?))|(\/(?:\\.|\[(?:\\.|[^\n\]])*\]|[^\[\/\n])+\/[gimy]*)|(==|!=|->|=>|>>|<<|<=|>=|--|\+\+|\|\||&&|\.\.|[-*\/%+&^|]=|[;,?:|^&=<>+\-*\/%!~.\[\]{}()\"`]|[$_\w]+)|('(?:\\.|[^\\\'\n])*')|('(?:\\(?:.|\n|\r)|[^\\\'])*')|(\S+))/g;



var TOKENIZER_OP=/(?:[ \f\r\t\v\u00A0\u2028\u2029]+|\/\/.*|#!.*)*(?:((?:\n|\/\*(?:.|\n|\r)*?\*\/)+)|(>>>=|===|!==|>>>|<<=|>>=|==|!=|->|=>|>>|<<|<=|>=|--|\+\+|\|\||&&|\.\.|[-*\/%+&^|]=|[;,?:|^&=<>+\-*\/%!~.\[\]{}()\"`]|[$_\w]+))/g;



var TOKENIZER_IS=/((?:\\.|\#(?!\{)|[^#\\\"\n])+)|(\\\n)|(\n)|(\"|\#\{)/g;


var TOKENIZER_QUASI=/((?:\\.|\$(?![\{a-zA-Z_$])|[^$\\\`\n])+)|(\\\n)|(\n)|(\`|\$\{|\$(?=[a-zA-Z_$]))/g;




function SemanticToken(){}
SemanticToken.prototype={exsf:function(pctx){




throw new Error("Unexpected '"+this+"'")},excbp:0,excf:function(left,pctx){




throw new Error("Unexpected '"+this+"'")},stmtf:null,tokenizer:TOKENIZER_SA,toString:function(){









return "'"+this.id+"'"},exs:function(f){




this.exsf=f;

return this;
},exc:function(bp,f){
this.excbp=bp;

if(f)this.excf=f;
return this;
},stmt:function(f){
this.stmtf=f;

return this;
},ifx:function(bp,right_assoc){


this.excbp=bp;

if(right_assoc)bp-=.5;
this.excf=function(left,pctx){var right=parseExp(pctx,bp);


return new ph_infix_op(left,this.id,right,pctx);
};
return this;
},asg:function(bp,right_assoc){

this.excbp=bp;

if(right_assoc)bp-=.5;
this.excf=function(left,pctx){var right=parseExp(pctx,bp);


return new ph_assign_op(left,this.id,right,pctx);
};
return this;
},pre:function(bp){

return this.exs(function(pctx){
var right=parseExp(pctx,bp);


return new ph_prefix_op(this.id,right,pctx);
});
},pst:function(bp){

return this.exc(bp,function(left,pctx){
return new ph_postfix_op(left,this.id,pctx);


});
}};



function Literal(type,value){this.id=type;

this.value=value;
}
Literal.prototype=new SemanticToken();
Literal.prototype.tokenizer=TOKENIZER_OP;
Literal.prototype.toString=function(){return "literal '"+this.value+"'"};
Literal.prototype.exsf=function(pctx){return new ph_literal(this.value,pctx,this.id);


};


function Identifier(value){this.value=value;

}
Identifier.prototype=new Literal("<id>");
Identifier.prototype.exsf=function(pctx){return gen_identifier(this.value,pctx);


};
Identifier.prototype.toString=function(){return "identifier '"+this.value+"'"};



var ST=new Hash();
function S(id,tokenizer){var t=new SemanticToken();

t.id=id;
if(tokenizer)t.tokenizer=tokenizer;

ST.put(id,t);
return t;
}











































































S("[").exs(function(pctx){

var elements=[];

while(pctx.token.id!="]"){
if(elements.length)scan(pctx,",");
if(pctx.token.id==","){
elements.push((function(pctx){return new ph_literal("",pctx)})(pctx));
}else if(pctx.token.id=="]")break;else elements.push(parseExp(pctx,110));




}
scan(pctx,"]");

return new ph_arr_lit(elements,pctx);
}).exc(270,function(l,pctx){

var idxexp=parseExp(pctx);

scan(pctx,"]");

return new ph_idx_accessor(l,idxexp,pctx);
});

S(".").exc(270,function(l,pctx){if(pctx.token.id!="<id>")throw new Error("Expected an identifier, found '"+pctx.token+"' instead");


var name=pctx.token.value;
scan(pctx);

return new ph_dot_accessor(l,name,pctx);
});

S("new").exs(function(pctx){var exp=parseExp(pctx,260);

var args=[];
if(pctx.token.id=="("){
scan(pctx);
while(pctx.token.id!=")"){
if(args.length)scan(pctx,",");
args.push(parseExp(pctx,110));
}
scan(pctx,")");
}

return new ph_new(exp,args);
});

S("(").exs(function(pctx){

if(pctx.token.id==')'){


var op=scan(pctx,')');
if(op.id!='->'&&op.id!='=>')throw new Error("Was expecting '->' or '=>' after empty parameter list, but saw '"+pctx.token.id+"'");


scan(pctx);
return op.exsf(pctx);
}
var e=parseExp(pctx);
scan(pctx,")");

return new ph_group(e,pctx);
}).exc(260,function(l,pctx){

var args=[];

while(pctx.token.id!=")"){
if(args.length)scan(pctx,",");
args.push(parseExp(pctx,110));
}
scan(pctx,")");


if(pctx.token.id=='{'){

TOKENIZER_SA.lastIndex=pctx.lastIndex;
while(1){
var matches=TOKENIZER_SA.exec(pctx.src);
if(matches&&(matches[4]=='|'||matches[4]=='||')){



args.push(parseBlockLambda(scan(pctx).id,pctx));
}else if(matches&&matches[1]){

continue;
}
break;
}
}


return new ph_fun_call(l,args,pctx);
});

S("..").exc(255,function(l,pctx){var r=parseExp(pctx,255);


return gen_doubledot_call(l,r,pctx);
});

S("++").pre(240).pst(250).asi_restricted=true;
S("--").pre(240).pst(250).asi_restricted=true;

S("delete").pre(240);
S("void").pre(240);
S("typeof").pre(240);
S("+").pre(240).ifx(220);
S("-").pre(240).ifx(220);
S("~").pre(240);
S("!").pre(240);

S("*").ifx(230);
S("/").ifx(230);
S("%").ifx(230);



S("<<").ifx(210);
S(">>").ifx(210);
S(">>>").ifx(210);

S("<").ifx(200);
S(">").ifx(200);
S("<=").ifx(200);
S(">=").ifx(200);
S("instanceof").ifx(200);

S("in").ifx(200);

S("==").ifx(190);
S("!=").ifx(190);
S("===").ifx(190);
S("!==").ifx(190);

S("&").ifx(180);
S("^").ifx(170);
S("|").ifx(160);
S("&&").ifx(150);
S("||").ifx(140);

S("?").exc(130,function(test,pctx){var consequent=parseExp(pctx,110);

scan(pctx,":");
var alternative=parseExp(pctx,110);

return new ph_conditional(test,consequent,alternative,pctx);
});

S("=").asg(120,true);
S("*=").asg(120,true);
S("/=").asg(120,true);
S("%=").asg(120,true);
S("+=").asg(120,true);
S("-=").asg(120,true);
S("<<=").asg(120,true);
S(">>=").asg(120,true);
S(">>>=").asg(120,true);
S("&=").asg(120,true);
S("^=").asg(120,true);
S("|=").asg(120,true);

S("->").exs(function(pctx){

var body=parseExp(pctx,119.5);


return new ph_arrow(undefined,body,pctx);
}).exc(120,function(left,pctx){

var body=parseExp(pctx,119.5);


return new ph_arrow(left,body,pctx);
});
S("=>").exs(function(pctx){

var body=parseExp(pctx,119.5);


return new ph_arrow(undefined,body,pctx,true);
}).exc(120,function(left,pctx){

var body=parseExp(pctx,119.5);


return new ph_arrow(left,body,pctx,true);
});

S("spawn").pre(115);

S(",").ifx(110,true);


function parsePropertyName(token,pctx){var id=token.id;

if(id=="<id>"||id=="<string>"||id=="<number>")return token.value;

if(id=='"'){
if((token=scan(pctx)).id!="<string>"||scan(pctx,undefined,TOKENIZER_IS).id!='istr-"')throw new Error("Non-literal strings can't be used as property names ("+token+")");


return '"'+token.value+'"';
}
throw new Error("Invalid object literal syntax; property name expected, but saw "+token);
}

function parseBlock(pctx){push_stmt_scope(pctx);


while(pctx.token.id!="}"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);
}
scan(pctx,"}");

return pop_block(pctx);
}

function parseBlockLambdaBody(pctx){push_decl_scope(pctx,true);

push_stmt_scope(pctx);
while(pctx.token.id!="}"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);;
}
scan(pctx,"}");

var decls=pctx.decl_scopes.pop();return collect_decls(decls)+pop_stmt_scope(pctx,"return __oni_rt.exbl(this,["+1,"])");
}
function parseBlockLambda(start,pctx){var pars;


if(start=='||'){
pars=[];
scan(pctx);
}else{
pars=parseFunctionParams(pctx,'|','|');
}

var body=parseBlockLambdaBody(pctx);

return new ph_blocklambda(pars,body,pctx);
}

S("{").exs(function(pctx){
var start=pctx.token.id;

if(start=="|"||start=="||"){

return parseBlockLambda(start,pctx);
}else{


var props=[];
while(pctx.token.id!="}"){
if(props.length)scan(pctx,",");
var prop=pctx.token;
if(prop.id=="}")break;

prop=parsePropertyName(prop,pctx);
scan(pctx);
if(pctx.token.id==":"){

scan(pctx);
var exp=parseExp(pctx,110);
props.push(["prop",prop,exp]);
}else if(pctx.token.id=="}"||pctx.token.id==","){

if(prop.charAt(0)=="'"||prop.charAt(0)=='"')throw new Error("Quoted identifiers not allowed in destructuring patterns ("+prop+")");

props.push(["pat",prop,pctx.line]);
}else throw new Error("Unexpected token '"+pctx.token+"'");


}
scan(pctx,"}",TOKENIZER_OP);

return new ph_obj_lit(props,pctx);
}
}).exc(260,function(l,pctx){

var start=pctx.token.id;

if(start!="|"&&start!="||")throw new Error("Unexpected token '"+pctx.token+"' - was expecting '|' or '||'");

var args=[parseBlockLambda(start,pctx)];

return new ph_fun_call(l,args,pctx);;
}).stmt(parseBlock);




S(";").stmt(function(pctx){return ph_empty_stmt});
S(")",TOKENIZER_OP);
S("]",TOKENIZER_OP);
S("}");
S(":");

S("<eof>").exs(function(pctx){
throw new Error("Unexpected end of input (exs)")}).stmt(function(pctx){
throw new Error("Unexpected end of input (stmt)")});




function parseFunctionBody(pctx,implicit_return){push_decl_scope(pctx);

push_stmt_scope(pctx);
scan(pctx,"{");
while(pctx.token.id!="}"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);
}
scan(pctx,"}");

var decls=pctx.decl_scopes.pop();var flags=1;if(decls.notail)flags+=8;if(implicit_return)flags+=32;return collect_decls(decls)+pop_stmt_scope(pctx,"return __oni_rt.exseq(arguments,this,"+pctx.filename+",["+flags,"])");
}

function parseFunctionParam(pctx){var t=pctx.token;

scan(pctx);
var left=t.exsf(pctx);
while(pctx.token.id!='|'&&pctx.token.excbp>110){
t=pctx.token;
scan(pctx);
left=t.excf(left,pctx);
}
return left;
}

function parseFunctionParams(pctx,starttok,endtok){if(!starttok){
starttok='(';endtok=')'}
var pars=[];
scan(pctx,starttok);
while(pctx.token.id!=endtok){
if(pars.length)scan(pctx,",");

switch(pctx.token.id){case "{":

case "[":
pars.push(parseFunctionParam(pctx));
break;
case "<id>":
pars.push(pctx.token.exsf(pctx));
scan(pctx);
break;
default:
throw new Error("Expected function parameter but found '"+pctx.token+"'");
}
token=pctx.token;
}
scan(pctx,endtok);
return pars;
}


S("function").exs(function(pctx){

var fname="";

if(pctx.token.id=="<id>"){
fname=pctx.token.value;
scan(pctx);
}
var pars=parseFunctionParams(pctx);
var body=parseFunctionBody(pctx);

return new ph_fun_exp(fname,pars,body,pctx,false);
}).stmt(function(pctx){

if(pctx.token.id!="<id>")throw new Error("Malformed function declaration");

var fname=pctx.token.value;
scan(pctx);
var pars=parseFunctionParams(pctx);
var body=parseFunctionBody(pctx);

return gen_fun_decl(fname,pars,body,pctx);
});

S("this",TOKENIZER_OP).exs(function(pctx){return new ph_envobj('this','tobj',pctx)});
S("true",TOKENIZER_OP).exs(function(pctx){return new ph_literal('true',pctx)});
S("false",TOKENIZER_OP).exs(function(pctx){return new ph_literal('false',pctx)});
S("null",TOKENIZER_OP).exs(function(pctx){return new ph_literal('null',pctx)});

S("collapse",TOKENIZER_OP).exs(function(pctx){return new ph_collapse(pctx)});

S('"',TOKENIZER_IS).exs(function(pctx){var parts=[],last=-1;

while(pctx.token.id!='istr-"'){
switch(pctx.token.id){case "<string>":





if(last!=-1&&typeof parts[last]=='string'){
parts[last]+=pctx.token.value;
}else{

parts.push(pctx.token.value);
++last;
}
break;
case 'istr-#{':
scan(pctx);




parts.push([parseExp(pctx)]);
++last;
break;
case "<eof>":
throw new Error("Unterminated string");
break;
default:
throw new Error("Internal parser error: Unknown token in string ("+pctx.token+")");
}
scan(pctx,undefined,TOKENIZER_IS);
}
scan(pctx);

if(last==-1){
parts.push('');
last=0;
}

if(last==0&&typeof parts[0]=='string'){
var val='"'+parts[0]+'"';
return new ph_literal(val,pctx,'<string>');
}
return new ph_interpolating_str(parts,pctx);
});

S('istr-#{',TOKENIZER_SA);
S('istr-"',TOKENIZER_OP);

S('`',TOKENIZER_QUASI).exs(function(pctx){var parts=[],current=0;

while(pctx.token.id!='quasi-`'){
switch(pctx.token.id){case '<string>':





if(current%2)parts[current-1]+=pctx.token.value;else{


parts.push(pctx.token.value);
++current;
}
break;
case 'quasi-${':
scan(pctx);


if((current%2)==0){
parts.push('');
++current;
}
parts.push(parseExp(pctx));
++current;
break;
case 'quasi-$':


if((current%2)==0){
parts.push('');
++current;
}
parts.push(parseQuasiInlineEscape(pctx));
++current;
break;

case '<eof>':
throw new Error('Unterminated string');
break;
default:
throw new Error('Internal parser error: Unknown token in string ('+pctx.token+')');
}
scan(pctx,undefined,TOKENIZER_QUASI);
}
scan(pctx);


if(current==0){
parts.push('');
}

return new ph_quasi_template(parts,pctx);;
});

function parseQuasiInlineEscape(pctx){var identifier=scan(pctx);


if(pctx.token.id!="<id>")throw new Error("Unexpected "+pctx.token+" in quasi template");
if(pctx.src.charAt(pctx.lastIndex)!='('){

return identifier.exsf(pctx);
}else{

scan(pctx);
scan(pctx,'(');

var args=[];
while(pctx.token.id!=')'){
if(args.length)scan(pctx,',');
args.push(parseExp(pctx,110));
}
return new ph_fun_call(identifier.exsf(pctx),args,pctx);
}
}

S('quasi-${',TOKENIZER_SA);
S('quasi-$',TOKENIZER_SA);
S('quasi-`',TOKENIZER_OP);

function isStmtTermination(token){return token.id==";"||token.id=="}"||token.id=="<eof>";

}

function parseStmtTermination(pctx){if(pctx.token.id!="}"&&pctx.token.id!="<eof>"&&!pctx.newline)scan(pctx,";");


}

function parseVarDecls(pctx,noIn){var decls=[];

var parse=noIn?parseExpNoIn:parseExp;
do {
if(decls.length)scan(pctx,",");
var id_or_pattern=parse(pctx,120);
if(pctx.token.id=="="){
scan(pctx);
var initialiser=parse(pctx,110);
decls.push([id_or_pattern,initialiser]);
}else decls.push([id_or_pattern]);


}while(pctx.token.id==",");
return decls;
}

S("var").stmt(function(pctx){var decls=parseVarDecls(pctx);

parseStmtTermination(pctx);

return gen_var_decl(decls,pctx);
});

S("else");

S("if").stmt(function(pctx){scan(pctx,"(");

var test=parseExp(pctx);
scan(pctx,")");
var consequent=parseStmt(pctx);
var alternative=null;
if(pctx.token.id=="else"){
scan(pctx);
alternative=parseStmt(pctx);
}

return new ph_if(test,consequent,alternative,pctx);
});

S("while").stmt(function(pctx){scan(pctx,"(");

var test=parseExp(pctx);
scan(pctx,")");
++top_decl_scope(pctx).break_scope;++top_decl_scope(pctx).continue_scope;
var body=parseStmt(pctx);
--top_decl_scope(pctx).break_scope;--top_decl_scope(pctx).continue_scope;

return new ph_loop(0,test,body);
});

S("do").stmt(function(pctx){++top_decl_scope(pctx).break_scope;
++top_decl_scope(pctx).continue_scope;
var body=parseStmt(pctx);
--top_decl_scope(pctx).break_scope;--top_decl_scope(pctx).continue_scope;
scan(pctx,"while");
scan(pctx,"(");
var test=parseExp(pctx);
scan(pctx,")");
parseStmtTermination(pctx);

return new ph_loop(2,test,body);
});

S("for").stmt(function(pctx){scan(pctx,"(");

var start_exp=null;
var decls=null;
if(pctx.token.id=="var"){
scan(pctx);
decls=parseVarDecls(pctx,true);
}else{

if(pctx.token.id!=';')start_exp=parseExpNoIn(pctx);

}

if(pctx.token.id==";"){
scan(pctx);
var test_exp=null;
if(pctx.token.id!=";")test_exp=parseExp(pctx);

scan(pctx,";");
var inc_exp=null;
if(pctx.token.id!=")")inc_exp=parseExp(pctx);

scan(pctx,")");
++top_decl_scope(pctx).break_scope;++top_decl_scope(pctx).continue_scope;
var body=parseStmt(pctx);
--top_decl_scope(pctx).break_scope;--top_decl_scope(pctx).continue_scope;

return gen_for(start_exp,decls,test_exp,inc_exp,body,pctx);
}else if(pctx.token.id=="in"){

scan(pctx);

if(decls&&decls.length>1)throw new Error("More than one variable declaration in for-in loop");

var obj_exp=parseExp(pctx);
scan(pctx,")");
++top_decl_scope(pctx).break_scope;++top_decl_scope(pctx).continue_scope;
var body=parseStmt(pctx);
--top_decl_scope(pctx).break_scope;--top_decl_scope(pctx).continue_scope;
var decl=decls?decls[0]:null;

return gen_for_in(start_exp,decl,obj_exp,body,pctx);
}else throw new Error("Unexpected token '"+pctx.token+"' in for-statement");


});

S("continue").stmt(function(pctx){var label=null;

if(pctx.token.id=="<id>"&&!pctx.newline){
label=pctx.token.value;
scan(pctx);
}
parseStmtTermination(pctx);

if(top_decl_scope(pctx).continue_scope)return new ph_cfe("c",pctx,label);else if(top_decl_scope(pctx).bl)return new ph_return(undefined,pctx);else throw new Error("Unexpected 'continue' statement");
});

S("break").stmt(function(pctx){var label=null;

if(pctx.token.id=="<id>"&&!pctx.newline){
label=pctx.token.value;
scan(pctx);
}
parseStmtTermination(pctx);

if(top_decl_scope(pctx).break_scope)return new ph_cfe("b",pctx,label);else if(top_decl_scope(pctx).bl)return new ph_bl_break(pctx,label);else throw new Error("Unexpected 'break' statement");
});

S("return").stmt(function(pctx){var exp=null;

if(!isStmtTermination(pctx.token)&&!pctx.newline)exp=parseExp(pctx);

parseStmtTermination(pctx);

if(top_decl_scope(pctx).bl)return new ph_bl_return(exp,pctx);else return new ph_return(exp,pctx);
});

S("with").stmt(function(pctx){scan(pctx,"(");

var exp=parseExp(pctx);
scan(pctx,")");
var body=parseStmt(pctx);

return new ph_with(exp,body,pctx);
});

S("case");
S("default");

S("switch").stmt(function(pctx){scan(pctx,"(");

var exp=parseExp(pctx);
scan(pctx,")");
scan(pctx,"{");
++top_decl_scope(pctx).break_scope;
var clauses=[];
while(pctx.token.id!="}"){
var clause_exp=null;
if(pctx.token.id=="case"){
scan(pctx);
clause_exp=parseExp(pctx);
}else if(pctx.token.id=="default"){

scan(pctx);
}else throw new Error("Invalid token '"+pctx.token+"' in switch statement");


scan(pctx,":");

push_stmt_scope(pctx);top_stmt_scope(pctx).exp=clause_exp;
while(pctx.token.id!="case"&&pctx.token.id!="default"&&pctx.token.id!="}"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);
}
clauses.push((function(pctx){return [top_stmt_scope(pctx).exp,pop_block(pctx)]})(pctx));
}
--top_decl_scope(pctx).break_scope;
scan(pctx,"}");

return new ph_switch(exp,clauses);(exp,clauses,pctx);
});

S("throw").stmt(function(pctx){if(pctx.newline)throw new Error("Illegal newline after throw");

var exp=parseExp(pctx);
parseStmtTermination(pctx);

return new ph_throw(exp,pctx);;
});

S("catch");
S("finally");





function parseCRF(pctx){var rv=[];

var a=null;
if(pctx.token.id=="catch"||pctx.token.value=="catchall"){



var all=pctx.token.value=="catchall";
a=[];
scan(pctx);
a.push(scan(pctx,"(").value);
scan(pctx,"<id>");
scan(pctx,")");
scan(pctx,"{");
a.push(parseBlock(pctx));
a.push(all);
}
rv.push(a);
if(pctx.token.value=="retract"){
scan(pctx);
scan(pctx,"{");
rv.push(parseBlock(pctx));
}else rv.push(null);


if(pctx.token.id=="finally"){
scan(pctx);
scan(pctx,"{");
rv.push(parseBlock(pctx));
}else rv.push(null);


return rv;
}

S("try").stmt(function(pctx){scan(pctx,"{");

var block=parseBlock(pctx);
var op=pctx.token.value;
if(op!="and"&&op!="or"){

var crf=parseCRF(pctx);
if(!crf[0]&&!crf[1]&&!crf[2])throw new Error("Missing 'catch', 'finally' or 'retract' after 'try'");


return new ph_try(block,crf,pctx);
}else{

var blocks=[block];
do {
scan(pctx);
scan(pctx,"{");
blocks.push(parseBlock(pctx));
}while(pctx.token.value==op);
var crf=parseCRF(pctx);

return gen_waitfor_andor(op,blocks,crf,pctx);
}
});

S("waitfor").stmt(function(pctx){if(pctx.token.id=="{"){


scan(pctx,"{");
var blocks=[parseBlock(pctx)];
var op=pctx.token.value;
if(op!="and"&&op!="or")throw new Error("Missing 'and' or 'or' after 'waitfor' block");
do {
scan(pctx);
scan(pctx,"{");
blocks.push(parseBlock(pctx));
}while(pctx.token.value==op);
var crf=parseCRF(pctx);

return gen_waitfor_andor(op,blocks,crf,pctx);
}else{


scan(pctx,"(");
var has_var=(pctx.token.id=="var");
if(has_var)scan(pctx);
var decls=[];
if(pctx.token.id==")"){
if(has_var)throw new Error("Missing variables in waitfor(var)");
}else decls=parseVarDecls(pctx);


scan(pctx,")");
scan(pctx,"{");

++top_decl_scope(pctx).fscoped_ctx;
var block=parseBlock(pctx);
var crf=parseCRF(pctx);

--top_decl_scope(pctx).fscoped_ctx;

return gen_suspend(has_var,decls,block,crf,pctx);
}
});


S("using").stmt(function(pctx){var has_var;

scan(pctx,"(");
if(has_var=(pctx.token.id=="var"))scan(pctx);

var lhs,exp;
var e1=parseExp(pctx,120);
if(pctx.token.id=="="){
lhs=e1;
scan(pctx);
exp=parseExp(pctx);
}else{

if(has_var)throw new Error("Syntax error in 'using' expression");

exp=e1;
}
scan(pctx,")");
var body=parseStmt(pctx);

return gen_using(has_var,lhs,exp,body,pctx);
});

S("__js").stmt(function(pctx){if(pctx.allow_nblock)++pctx.js_ctx;


var body=parseStmt(pctx);

if(pctx.allow_nblock)--pctx.js_ctx;

body.is_nblock=pctx.allow_nblock;return body;
});



S("abstract");
S("boolean");
S("byte");
S("char");
S("class");
S("const");
S("debugger");
S("double");
S("enum");
S("export");
S("extends");
S("final");
S("float");
S("goto");
S("implements");
S("import");
S("int");
S("interface");
S("long");
S("native");
S("package");
S("private");
S("protected");
S("public");
S("short");
S("static");
S("super");
S("synchronized");
S("throws");
S("transient");
S("volatile");




function makeParserContext(src,settings){var ctx={src:src,line:1,lastIndex:0,token:null};







if(settings)for(var a in settings)ctx[a]=settings[a];



return ctx;
}


function compile(src,settings){var pctx=makeParserContext(src+"\n",settings);









try{
return parseScript(pctx);
}catch(e){

var mes=e.mes||e;
var line=e.line||pctx.line;
var exception=new Error("SJS syntax error "+(pctx.filename?"in "+pctx.filename+",":"at")+" line "+line+": "+mes);
exception.compileError={message:mes,line:line};
throw exception;
}
}
exports.compile=compile;

function parseScript(pctx){begin_script(pctx);

scan(pctx);
while(pctx.token.id!="<eof>"){
var stmt=parseStmt(pctx);

add_stmt(stmt,pctx);;
}
return end_script(pctx);
}

function parseStmt(pctx){var t=pctx.token;

scan(pctx);
if(t.stmtf){

return t.stmtf(pctx);
}else if(t.id=="<id>"&&pctx.token.id==":"){


scan(pctx);

var stmt=parseStmt(pctx);

return new ph_lbl_stmt(t.value,stmt);
}else{


var exp=parseExp(pctx,0,t);
parseStmtTermination(pctx);

return new ph_exp_stmt(exp,pctx);
}
}


function parseExp(pctx,bp,t){bp=bp||0;

if(!t){
t=pctx.token;
scan(pctx);
}
var left=t.exsf(pctx);
while(bp<pctx.token.excbp){
t=pctx.token;

if(pctx.newline&&t.asi_restricted)return left;

scan(pctx);
left=t.excf(left,pctx);
}
return left;
}


function parseExpNoIn(pctx,bp,t){bp=bp||0;

if(!t){
t=pctx.token;
scan(pctx);
}
var left=t.exsf(pctx);
while(bp<pctx.token.excbp&&pctx.token.id!='in'){
t=pctx.token;

if(pctx.newline&&t.asi_restricted)return left;

scan(pctx);
left=t.excf(left,pctx);
}
return left;
}


function scan(pctx,id,tokenizer){if(!tokenizer){

if(pctx.token)tokenizer=pctx.token.tokenizer;else tokenizer=TOKENIZER_SA;



}

if(id&&(!pctx.token||pctx.token.id!=id))throw new Error("Unexpected "+pctx.token);

pctx.token=null;
pctx.newline=0;
while(!pctx.token){
tokenizer.lastIndex=pctx.lastIndex;
var matches=tokenizer.exec(pctx.src);
if(!matches){
pctx.token=ST.lookup("<eof>");
break;
}
pctx.lastIndex=tokenizer.lastIndex;

if(tokenizer==TOKENIZER_SA){
if(matches[4]){
pctx.token=ST.lookup(matches[4]);
if(!pctx.token){
pctx.token=new Identifier(matches[4]);
}
}else if(matches[1]){

var m=matches[1].match(/\n/g);
if(m){
pctx.line+=m.length;
pctx.newline+=m.length;

}

}else if(matches[5])pctx.token=new Literal("<string>",matches[5]);else if(matches[6]){



var val=matches[6];
var m=val.match(/\n/g);
pctx.line+=m.length;
pctx.newline+=m.length;
val=val.replace(/\\\n/g,"").replace(/\n/g,"\\n");
pctx.token=new Literal("<string>",val);
}else if(matches[2])pctx.token=new Literal("<number>",matches[2]);else if(matches[3])pctx.token=new Literal("<regex>",matches[3]);else if(matches[7])throw new Error("Unexpected characters: '"+matches[7]+"'");else throw new Error("Internal scanner error");









}else if(tokenizer==TOKENIZER_OP){

if(matches[2]){
pctx.token=ST.lookup(matches[2]);
if(!pctx.token){
pctx.token=new Identifier(matches[2]);
}
}else if(matches[1]){

var m=matches[1].match(/\n/g);
if(m){
pctx.line+=m.length;
pctx.newline+=m.length;

}

}else{




tokenizer=TOKENIZER_SA;

}

}else if(tokenizer==TOKENIZER_IS){


if(matches[1])pctx.token=new Literal("<string>",matches[1]);else if(matches[2]){


++pctx.line;
++pctx.newline;

}else if(matches[3]){

++pctx.line;
++pctx.newline;
pctx.token=new Literal("<string>",'\\n');
}else if(matches[4]){

pctx.token=ST.lookup("istr-"+matches[4]);
}
}else if(tokenizer==TOKENIZER_QUASI){


if(matches[1])pctx.token=new Literal("<string>",matches[1]);else if(matches[2]){


++pctx.line;
++pctx.newline;

}else if(matches[3]){

++pctx.line;
++pctx.newline;
pctx.token=new Literal("<string>",'\\n');
}else if(matches[4]){

pctx.token=ST.lookup("quasi-"+matches[4]);
}
}else throw new Error("Internal scanner error: no tokenizer");


}
return pctx.token;
}


})(__oni_rt.c1={});if(!Array.isArray){

















































































Array.isArray=function(o){return Object.prototype.toString.call(o)==='[object Array]';

};
}


if(!Array.prototype.indexOf){
Array.prototype.indexOf=function(val){var len=this.length>>>0;

var i=Math.floor(arguments[1]||0);
if(i<0)i=Math.max(len-Math.abs(i),0);

for(;i<len;++i){
if(i in this&&this[i]===val)return i;

}
return -1;
};
}


if(!Array.prototype.lastIndexOf){
Array.prototype.lastIndexOf=function(val){var len=this.length>>>0;

var i=arguments[1]===undefined?len:Math.floor(arguments[1]);
if(i>=0)i=Math.min(i,len-1);else i+=len;




for(;i>=0;--i){
if(i in this&&this[i]===val)return i;

}
return -1;
};
}


if(!Object.create){


Object.create=function create(p){function Cls(){
};
Cls.prototype=p;
return new Cls();
};
}


if(!Object.keys){




Object.keys=function(o){var rv=[],p;

for(p in o)if(Object.prototype.hasOwnProperty.call(o,p))rv.push(p);


return rv;
};
}


if(!Object.getPrototypeOf){
Object.getPrototypeOf="".__proto__===String.prototype?function(object){
return object.__proto__;

}:function(object){
return object.constructor.prototype;


};
}


if(!Function.prototype.bind){




Function.prototype.bind=function(obj){var slice=[].slice,args=slice.call(arguments,1),self=this,nop=function(){



},bound=function(){
var subject=(obj||{});

try{
if(this instanceof nop)subject=this;
}catch(e){}
return self.apply(subject,args.concat(slice.call(arguments)));
};


nop.prototype=self.prototype;
bound.prototype=new nop();
return bound;
};
}


if(!String.prototype.trim){
String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g,'');

};
}







(function(exports) {var UNDEF,pendingLoads,compiled_src_tag,github_api,github_opts;function URI(){}function makeRequire(parent){var rf;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){rf=function (module,settings){var opts;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(470,function(_oniX){return opts=_oniX;},__oni_rt.C(function(){return exports.extendObject({},settings)},469)),__oni_rt.Nb(function(){if(opts.callback)return __oni_rt.ex(__oni_rt.Spawn(479,__oni_rt.C(function(){return (function (){var rv;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Try(0,__oni_rt.Sc(474,function(_oniX){return rv=_oniX;},__oni_rt.C(function(){return requireInner(module,rf,parent,opts)},473)),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.C(function(){return opts.callback(e)},476),__oni_rt.Nb(function(){return __oni_rt.Return(1);},476)),__oni_env)},0),__oni_rt.C(function(){return opts.callback(UNDEF,rv)},478)])})()},479)),this);else return __oni_rt.ex(__oni_rt.Sc(482,__oni_rt.Return,__oni_rt.C(function(){return requireInner(module,rf,parent,opts)},482)),this);},470)])};rf.resolve=function (module,settings){var opts;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(487,function(_oniX){return opts=_oniX;},__oni_rt.C(function(){return exports.extendObject({},settings)},486)),__oni_rt.Sc(487,__oni_rt.Return,__oni_rt.C(function(){return resolve(module,rf,parent,opts)},487))])};rf.url=function (relative){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(492,__oni_rt.Return,__oni_rt.Sc(492,function(l){return l.path;},__oni_rt.C(function(){return resolve(relative,rf,parent,{loader:'dummy'})},492)))])};rf.path="";return rf.alias={};},485),__oni_rt.Nb(function(){if(exports.require)return __oni_rt.ex(__oni_rt.Nb(function(){rf.hubs=exports.require.hubs;rf.modules=exports.require.modules;return rf.extensions=exports.require.extensions;},500),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Sc(506,function(_oniX){return rf.hubs=_oniX;},__oni_rt.Fcall(0,506,__oni_rt.Nb(function(){return augmentHubs},506),__oni_rt.C(function(){return getHubs_hostenv()},506))),__oni_rt.Nb(function(){return rf.modules={};},507),__oni_rt.Sc(509,function(_oniX){return rf.extensions=_oniX;},__oni_rt.C(function(){return getExtensions_hostenv()},509))),this);},499),__oni_rt.Nb(function(){return __oni_rt.Return(rf);},511)])}function augmentHubs(hubs){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){hubs.addDefault=function (hub){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.If(__oni_rt.Sc(517,function(r){return ! r},__oni_rt.C(function(){return this.tobj.defined(hub[0])},517)),__oni_rt.Seq(0,__oni_rt.C(function(){return this.tobj.push(hub)},518),__oni_rt.Nb(function(){return __oni_rt.Return(true);},519))),__oni_rt.Nb(function(){return __oni_rt.Return(false);},521)])};hubs.defined=function (prefix){var h,l,i;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},529),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < this.tobj.length},524),__oni_rt.Nb(function(){return i++ },524),__oni_rt.Nb(function(){h=this.tobj[i][0];},526),__oni_rt.Sc(527,function(_oniX){return l=_oniX;},__oni_rt.C(function(){return Math.min(h.length,prefix.length)},526)),__oni_rt.If(__oni_rt.Sc(527,__oni_rt.infix['=='],__oni_rt.C(function(){return h.substr(0,l)},527),__oni_rt.C(function(){return prefix.substr(0,l)},527)),__oni_rt.Nb(function(){return __oni_rt.Return(true);},527)))),__oni_rt.Nb(function(){return __oni_rt.Return(false);},529)])};return __oni_rt.Return(hubs);},522)])}function html_sjs_extractor(html,descriptor){var re,match,src;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){re=/<script (?:[^>]+ )?(?:type=['"]text\/sjs['"]|main=['"]([^'"]+)['"])[^>]*>((.|\n)*?)<\/script>/mg;src='';},536),__oni_rt.Loop(0,__oni_rt.Sc(538,function(_oniX){return match=_oniX;},__oni_rt.C(function(){return re.exec(html)},538)),0,__oni_rt.Nb(function(){if(match[1])return __oni_rt.ex(__oni_rt.Nb(function(){return src+='require("' + match[1] + '")'},539),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return src+=match[2]},540),this);},539),__oni_rt.Nb(function(){return src+=';';},542)),__oni_rt.Nb(function(){if(! src)return __oni_rt.ex(__oni_rt.Sc(543,__oni_rt.Throw,__oni_rt.Fcall(2,543,__oni_rt.Nb(function(){return Error},543),"No sjs found in HTML file"),543,'apollo-sys-common.sjs'),this);},543),__oni_rt.Sc(544,__oni_rt.Return,__oni_rt.C(function(){return default_compiler(src,descriptor)},544))])}function resolveAliases(module,aliases){var ALIAS_REST,alias_rest,alias,rv,level;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){ALIAS_REST=/^([^:]+):(.*)$/;rv=module;level=10;},550),__oni_rt.Loop(0,__oni_rt.Seq(4,__oni_rt.Sc(553,function(_oniX){return alias_rest=_oniX;},__oni_rt.C(function(){return ALIAS_REST.exec(rv)},553)),__oni_rt.Nb(function(){return alias=aliases[alias_rest[1]]},554)),0,__oni_rt.Nb(function(){if(-- level == 0)return __oni_rt.ex(__oni_rt.Sc(556,__oni_rt.Throw,__oni_rt.Fcall(2,556,__oni_rt.Nb(function(){return Error},556),__oni_rt.Nb(function(){return "Too much aliasing in modulename '" + module + "'"},556)),556,'apollo-sys-common.sjs'),this);},555),__oni_rt.Nb(function(){return rv=alias + alias_rest[2];},557)),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},559)])}function resolveHubs(module,hubs,require_obj,parent,opts){var path,loader,src,level,i,hub;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){path=module;loader=opts.loader || default_loader;src=opts.src || default_src_loader;},565),__oni_rt.If(__oni_rt.Sc(569,__oni_rt.infix['=='],__oni_rt.C(function(){return path.indexOf(":")},569),__oni_rt.Nb(function(){return - 1},569)),__oni_rt.Sc(570,function(_oniX){return path=_oniX;},__oni_rt.C(function(){return resolveSchemelessURL_hostenv(path,require_obj,parent)},570))),__oni_rt.Nb(function(){level=10;},573),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},596),__oni_rt.Loop(0,__oni_rt.Nb(function(){return hub=hubs[i++ ]},573),0,__oni_rt.If(__oni_rt.Sc(574,__oni_rt.infix['=='],__oni_rt.C(function(){return path.indexOf(hub[0])},574),0),__oni_rt.Nb(function(){if(typeof hub[1] == "string")return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Sc(577,function(_oniX){return path=_oniX;},__oni_rt.Sc(577,__oni_rt.infix['+'],__oni_rt.Nb(function(){return hub[1]},577),__oni_rt.C(function(){return path.substring(hub[0].length)},577))),__oni_rt.If(__oni_rt.Sc(579,__oni_rt.infix['=='],__oni_rt.C(function(){return path.indexOf(":")},579),__oni_rt.Nb(function(){return - 1},579)),__oni_rt.Sc(580,function(_oniX){return path=_oniX;},__oni_rt.C(function(){return resolveSchemelessURL_hostenv(path,require_obj,parent)},580))),__oni_rt.Nb(function(){return i=0;},581),__oni_rt.Nb(function(){if(-- level == 0)return __oni_rt.ex(__oni_rt.Sc(583,__oni_rt.Throw,__oni_rt.Fcall(2,583,__oni_rt.Nb(function(){return Error},583),__oni_rt.Nb(function(){return "Too much indirection in hub resolution for module '" + module + "'"},583)),583,'apollo-sys-common.sjs'),this);},582)),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(typeof hub[1] == "object")return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){if(hub[1].src)return __oni_rt.ex(__oni_rt.Nb(function(){return src=hub[1].src},586),this);},586),__oni_rt.Nb(function(){if(hub[1].loader)return __oni_rt.ex(__oni_rt.Nb(function(){return loader=hub[1].loader},587),this);},587),__oni_rt.Nb(function(){return __oni_rt.Break();},0)),this);else return __oni_rt.ex(__oni_rt.Sc(592,__oni_rt.Throw,__oni_rt.Fcall(2,592,__oni_rt.Nb(function(){return Error},592),__oni_rt.Nb(function(){return "Unexpected value for require.hubs element '" + hub[0] + "'"},592)),592,'apollo-sys-common.sjs'),this);},585),this);},576)))),__oni_rt.Nb(function(){return __oni_rt.Return({path:path,loader:loader,src:src});},596)])}function default_src_loader(path){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(601,__oni_rt.Throw,__oni_rt.Fcall(2,601,__oni_rt.Nb(function(){return Error},601),__oni_rt.Nb(function(){return "Don't know how to load module at " + path},601)),601,'apollo-sys-common.sjs')])}function default_compiler(src,descriptor){var f;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){if(typeof (src) === 'function')return __oni_rt.ex(__oni_rt.Nb(function(){return f=src;},610),this);else return __oni_rt.ex(__oni_rt.If(__oni_rt.C(function(){return compiled_src_tag.exec(src)},612),__oni_rt.Sc(618,function(_oniX){return f=_oniX;},__oni_rt.Fcall(2,618,__oni_rt.Nb(function(){return Function},618),"module","exports","require","__onimodulename",__oni_rt.Nb(function(){return src},618))),__oni_rt.Sc(622,function(_oniX){return f=_oniX;},__oni_rt.C(function(){return exports.eval("(function(module,exports,require, __onimodulename){" + src + "\n})",{filename:("module "+(descriptor.id))})},622))),this);},609),__oni_rt.C(function(){return f(descriptor,descriptor.exports,descriptor.require,("module "+(descriptor.id)))},624)])}function default_loader(path,parent,src_loader,opts){var extension,compile,descriptor,pendingHook,dependents,q,dep,pending,descriptor;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(634,function(_oniX){return extension=_oniX;},__oni_rt.Sc(634,function(l, idx){return l[idx];},__oni_rt.C(function(){return /.+\.([^\.\/]+)$/.exec(path)},632),1)),__oni_rt.Nb(function(){compile=exports.require.extensions[extension];},635),__oni_rt.Nb(function(){if(! compile)return __oni_rt.ex(__oni_rt.Sc(636,__oni_rt.Throw,__oni_rt.Fcall(2,636,__oni_rt.Nb(function(){return Error},636),__oni_rt.Nb(function(){return "Unknown type '" + extension + "'"},636)),636,'apollo-sys-common.sjs'),this);},635),__oni_rt.Nb(function(){if(! (descriptor=exports.require.modules[path]))return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){pendingHook=pendingLoads[path];},642),__oni_rt.Nb(function(){if(! pendingHook)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Sc(677,function(_oniX){return pendingHook=_oniX;},__oni_rt.Sc(677,function(_oniX){return pendingLoads[path]=_oniX;},__oni_rt.Spawn(677,__oni_rt.C(function(){return (function (){var src,loaded_from,descriptor;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){if(typeof src_loader === "string")return __oni_rt.ex(__oni_rt.Nb(function(){src=src_loader;return loaded_from="[src string]";},646),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(path in __oni_rt.modsrc)return __oni_rt.ex(__oni_rt.Nb(function(){loaded_from="[builtin]";src=__oni_rt.modsrc[path];return delete __oni_rt.modsrc[path];},651),this);else return __oni_rt.ex(__oni_rt.Sc(657,function(_oniX){src=_oniX.src;loaded_from=_oniX.loaded_from;},__oni_rt.C(function(){return src_loader(path)},657)),this);},649),this);},645),__oni_rt.Sc(667,function(_oniX){return descriptor=_oniX;},__oni_rt.Sc(666,__oni_rt.Obj, ["id","exports","loaded_from","loaded_by","required_by","require"],__oni_rt.Nb(function(){return path},660),__oni_rt.Nb(function(){return {}},661),__oni_rt.Nb(function(){return loaded_from},662),__oni_rt.Nb(function(){return parent},663),__oni_rt.Nb(function(){return {}},664),__oni_rt.C(function(){return makeRequire(path)},666))),__oni_rt.Nb(function(){if(opts.main)return __oni_rt.ex(__oni_rt.Nb(function(){return descriptor.require.main=descriptor},667),this);},667),__oni_rt.C(function(){return compile(src,descriptor)},668),__oni_rt.Nb(function(){exports.require.modules[path]=descriptor;return __oni_rt.Return(descriptor);},674)])})()},677)))),__oni_rt.Nb(function(){return pendingHook.parentModules=[parent];},678)),this);else return __oni_rt.ex(__oni_rt.C(function(){return pendingHook.parentModules.push(parent)},680),this);},642),__oni_rt.Nb(function(){dependents={};q=[parent];},685),__oni_rt.Loop(0,__oni_rt.Nb(function(){return q.length > 0},686),0,__oni_rt.Sc(688,function(_oniX){return dep=_oniX;},__oni_rt.C(function(){return q.shift()},687)),__oni_rt.Nb(function(){if(dep === path)return __oni_rt.ex(__oni_rt.Sc(689,__oni_rt.Throw,__oni_rt.Fcall(2,689,__oni_rt.Nb(function(){return Error},689),__oni_rt.Nb(function(){return ("Circular module dependency loading "+(path))},689)),689,'apollo-sys-common.sjs'),this);},688),__oni_rt.If(__oni_rt.C(function(){return dependents.hasOwnProperty(dep)},691),__oni_rt.Nb(function(){return __oni_rt.Cont();},0),__oni_rt.Nb(function(){return dependents[dep]=true},692)),__oni_rt.Nb(function(){pending=pendingLoads[dep];},694),__oni_rt.Nb(function(){if(pending)return __oni_rt.ex(__oni_rt.Sc(695,function(_oniX){return q=_oniX;},__oni_rt.C(function(){return q.concat(pending.parentModules)},695)),this);},694)),__oni_rt.Try(0,__oni_rt.Sc(701,function(_oniX){return descriptor=_oniX;},__oni_rt.C(function(){return pendingHook.waitforValue()},700)),0,__oni_rt.If(__oni_rt.Sc(704,__oni_rt.infix['=='],__oni_rt.C(function(){return pendingHook.waiting()},704),0),__oni_rt.Nb(function(){return delete pendingLoads[path]},705)))),this);},639),__oni_rt.Nb(function(){if(! descriptor.required_by[parent])return __oni_rt.ex(__oni_rt.Nb(function(){return descriptor.required_by[parent]=1},710),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return ++ descriptor.required_by[parent]},712),this);},709),__oni_rt.Nb(function(){return __oni_rt.Return(descriptor.exports);},714)])}function http_src_loader(path){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(721,__oni_rt.Return,__oni_rt.Sc(721,__oni_rt.Obj, ["src","loaded_from"],__oni_rt.C(function(){return request_hostenv([path,{format:'compiled'}],{mime:'text/plain'})},719),__oni_rt.Nb(function(){return path},721)))])}function github_src_loader(path){var user,repo,tag,url,data,str;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Try(0,__oni_rt.Sc(734,function(_oniX){user=_oniX[1];repo=_oniX[2];tag=_oniX[3];path=_oniX[4];},__oni_rt.C(function(){return /github:([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/.exec(path)},734)),function(__oni_env,e){return __oni_rt.ex(__oni_rt.Sc(735,__oni_rt.Throw,__oni_rt.Fcall(2,735,__oni_rt.Nb(function(){return Error},735),__oni_rt.Nb(function(){return "Malformed module id '" + path + "'"},735)),735,'apollo-sys-common.sjs'),__oni_env)},0),__oni_rt.Sc(739,function(_oniX){return url=_oniX;},__oni_rt.C(function(){return exports.constructURL(github_api,'repos',user,repo,"contents",path,{ref:tag})},737)),__oni_rt.Alt(__oni_rt.Sc(741,function(_oniX){return data=_oniX;},__oni_rt.Sc(740,function(l){return l.data;},__oni_rt.C(function(){return jsonp_hostenv(url,github_opts)},740))),__oni_rt.Seq(0,__oni_rt.C(function(){return __oni_rt.Hold(10000)},743),__oni_rt.Sc(744,__oni_rt.Throw,__oni_rt.Fcall(2,744,__oni_rt.Nb(function(){return Error},744),"Github timeout"),744,'apollo-sys-common.sjs'))),__oni_rt.Nb(function(){if(data.message && ! data.content)return __oni_rt.ex(__oni_rt.Sc(747,__oni_rt.Throw,__oni_rt.Fcall(2,747,__oni_rt.Nb(function(){return Error},747),__oni_rt.Nb(function(){return data.message},747)),747,'apollo-sys-common.sjs'),this);},746),__oni_rt.Sc(752,function(_oniX){return str=_oniX;},__oni_rt.C(function(){return exports.require('sjs:string')},750)),__oni_rt.Sc(755,__oni_rt.Return,__oni_rt.Sc(755,__oni_rt.Obj, ["src","loaded_from"],__oni_rt.Fcall(1,753,__oni_rt.Sc(753,function(l){return [l,'utf8ToUtf16'];},__oni_rt.Nb(function(){return str},753)),__oni_rt.C(function(){return str.base64ToOctets(data.content)},753)),__oni_rt.Nb(function(){return url},755)))])}function resolve(module,require_obj,parent,opts){var path,resolveSpec,matches,preload,path,contents;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(764,function(_oniX){return path=_oniX;},__oni_rt.C(function(){return resolveAliases(module,require_obj.alias)},761)),__oni_rt.Sc(767,function(_oniX){return resolveSpec=_oniX;},__oni_rt.C(function(){return resolveHubs(path,exports.require.hubs,require_obj,parent,opts)},764)),__oni_rt.Sc(767,function(_oniX){return resolveSpec.path=_oniX;},__oni_rt.C(function(){return exports.canonicalizeURL(resolveSpec.path,parent)},767)),__oni_rt.If(__oni_rt.Seq(4,__oni_rt.Nb(function(){return resolveSpec.loader == default_loader},770),__oni_rt.Sc(771,__oni_rt.infix['!='],__oni_rt.C(function(){return resolveSpec.path.charAt(resolveSpec.path.length - 1)},771),'/')),__oni_rt.Seq(0,__oni_rt.Sc(774,function(_oniX){return matches=_oniX;},__oni_rt.C(function(){return /.+\.([^\.\/]+)$/.exec(resolveSpec.path)},773)),__oni_rt.Nb(function(){if(! matches || ! exports.require.extensions[matches[1]])return __oni_rt.ex(__oni_rt.Nb(function(){return resolveSpec.path+=".sjs"},775),this);},774))),__oni_rt.If(__oni_rt.Sc(778,__oni_rt.infix['=='],__oni_rt.Nb(function(){return parent},778),__oni_rt.C(function(){return getTopReqParent_hostenv()},778)),__oni_rt.Nb(function(){return parent="[toplevel]"},779)),__oni_rt.Nb(function(){preload=__oni_rt.G.__oni_rt_bundle;path=resolveSpec.path;contents=preload[path];},782),__oni_rt.Nb(function(){if(contents !== undefined)return __oni_rt.ex(__oni_rt.Nb(function(){return resolveSpec.src=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){delete preload[path];return __oni_rt.Return({src:contents,loaded_from:path + "#bundle"});},787)])};},789),this);},784),__oni_rt.Nb(function(){return __oni_rt.Return(resolveSpec);},792)])}function requireInner(module,require_obj,parent,opts){var resolveSpec;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(812,function(_oniX){return resolveSpec=_oniX;},__oni_rt.C(function(){return resolve(module,require_obj,parent,opts)},809)),__oni_rt.Sc(812,function(_oniX){return module=_oniX;},__oni_rt.C(function(){return resolveSpec.loader(resolveSpec.path,parent,resolveSpec.src,opts)},812)),__oni_rt.Nb(function(){if(opts.copyTo)return __oni_rt.ex(__oni_rt.C(function(){return exports.extendObject(opts.copyTo,module)},814),this);},813),__oni_rt.Nb(function(){return __oni_rt.Return(module);},817)])}__oni_rt.exseq(this.arguments,this,'apollo-sys-common.sjs',[24,__oni_rt.Nb(function(){return __oni_rt.sys=exports;},55),__oni_rt.Nb(function(){if(! (__oni_rt.G.__oni_rt_bundle))return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.G.__oni_rt_bundle={};},66),this);},65),__oni_rt.Nb(function(){exports.hostenv=__oni_rt.hostenv;exports.getGlobal=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){return __oni_rt.Return(__oni_rt.G);},83)])};exports.isArrayLike=function (obj){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(96,__oni_rt.Return,__oni_rt.Seq(2,__oni_rt.Seq(2,__oni_rt.C(function(){return Array.isArray(obj)},94),__oni_rt.Sc(95,function(r){return ! r},__oni_rt.Sc(95,function(r){return ! r},__oni_rt.Seq(4,__oni_rt.Nb(function(){return obj},95),__oni_rt.C(function(){return Object.prototype.hasOwnProperty.call(obj,'callee')},95))))),__oni_rt.Nb(function(){return ! ! (typeof NodeList == 'function' && obj instanceof NodeList)},96)))])};exports.flatten=function (arr,rv){var rv,l,elem,i;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){rv=rv || [];l=arr.length;},111),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},119),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < l},112),__oni_rt.Nb(function(){return ++ i},112),__oni_rt.Nb(function(){elem=arr[i];},114),__oni_rt.If(__oni_rt.C(function(){return exports.isArrayLike(elem)},114),__oni_rt.C(function(){return exports.flatten(elem,rv)},115),__oni_rt.C(function(){return rv.push(elem)},117)))),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},119)])};exports.expandSingleArgument=function (args){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.If(__oni_rt.Seq(4,__oni_rt.Nb(function(){return args.length == 1},141),__oni_rt.C(function(){return exports.isArrayLike(args[0])},141)),__oni_rt.Nb(function(){return args=args[0]},142)),__oni_rt.Nb(function(){return __oni_rt.Return(args);},143)])};exports.isQuasi=function (obj){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){return __oni_rt.Return((obj instanceof __oni_rt.QuasiProto));},155)])};exports.Quasi=function (arr){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(163,__oni_rt.Return,__oni_rt.C(function(){return __oni_rt.Quasi.apply(__oni_rt,arr)},163))])};exports.mergeObjects=function (){var rv,sources,i;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){rv={};},172),__oni_rt.Sc(173,function(_oniX){return sources=_oniX;},__oni_rt.C(function(){return exports.expandSingleArgument(this.aobj)},172)),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},176),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < sources.length},173),__oni_rt.Nb(function(){return i++ },173),__oni_rt.C(function(){return exports.extendObject(rv,sources[i])},174))),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},176)])};exports.extendObject=function (dest,source){var o;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.ForIn(__oni_rt.Nb(function(){return source},184),function(__oni_env, _oniY) { return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return o=_oniY},188),__oni_rt.If(__oni_rt.C(function(){return Object.hasOwnProperty.call(source,o)},185),__oni_rt.Nb(function(){return dest[o]=source[o]},185))), __oni_env)}),__oni_rt.Nb(function(){return __oni_rt.Return(dest);},187)])};URI.prototype={toString:function (){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){return __oni_rt.Return(((this.tobj.protocol)+"://"+(this.tobj.authority)+(this.tobj.relative)));},209)])}};exports.parseURL=function (str){var o,m,uri,i;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Seq(0,__oni_rt.Nb(function(){o=exports.parseURL.options;},219),__oni_rt.Sc(219,function(_oniX){return m=_oniX;},__oni_rt.C(function(){return o.parser.exec(str)},215)),__oni_rt.Sc(219,function(_oniX){return uri=_oniX;},__oni_rt.Fcall(2,216,__oni_rt.Nb(function(){return URI},216))),__oni_rt.Nb(function(){i=14;},219)),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i-- },219),0,__oni_rt.Nb(function(){return uri[o.key[i]]=m[i] || ""},219)),__oni_rt.Nb(function(){return uri[o.q.name]={};},221),__oni_rt.C(function(){return uri[o.key[12]].replace(o.q.parser,function ($0,$1,$2){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){if($1)return __oni_rt.ex(__oni_rt.Nb(function(){return uri[o.q.name][$1]=$2},223),this);},223)])})},224),__oni_rt.Nb(function(){return __oni_rt.Return(uri);},226)])};exports.parseURL.options={key:["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],q:{name:"queryKey",parser:/(?:^|&)([^&=]*)=?([^&]*)/g},parser:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/};exports.constructQueryString=function (){var hashes,hl,parts,hash,l,val,i,q,h;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(248,function(_oniX){return hashes=_oniX;},__oni_rt.C(function(){return exports.flatten(this.aobj)},247)),__oni_rt.Nb(function(){hl=hashes.length;parts=[];},249),__oni_rt.Seq(0,__oni_rt.Nb(function(){h=0;},263),__oni_rt.Loop(0,__oni_rt.Nb(function(){return h < hl},250),__oni_rt.Nb(function(){return ++ h},250),__oni_rt.Nb(function(){hash=hashes[h];},252),__oni_rt.ForIn(__oni_rt.Nb(function(){return hash},252),function(__oni_env, _oniY) { return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return q=_oniY},263),__oni_rt.Seq(0,__oni_rt.Sc(254,function(_oniX){return l=_oniX;},__oni_rt.Sc(253,__oni_rt.infix['+'],__oni_rt.C(function(){return encodeURIComponent(q)},253),"=")),__oni_rt.Nb(function(){val=hash[q];},255),__oni_rt.If(__oni_rt.Sc(255,function(r){return ! r},__oni_rt.C(function(){return exports.isArrayLike(val)},255)),__oni_rt.Fcall(1,256,__oni_rt.Sc(256,function(l){return [l,'push'];},__oni_rt.Nb(function(){return parts},256)),__oni_rt.Sc(256,__oni_rt.infix['+'],__oni_rt.Nb(function(){return l},256),__oni_rt.C(function(){return encodeURIComponent(val)},256))),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},260),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < val.length},258),__oni_rt.Nb(function(){return ++ i},258),__oni_rt.Fcall(1,259,__oni_rt.Sc(259,function(l){return [l,'push'];},__oni_rt.Nb(function(){return parts},259)),__oni_rt.Sc(259,__oni_rt.infix['+'],__oni_rt.Nb(function(){return l},259),__oni_rt.C(function(){return encodeURIComponent(val[i])},259)))))))), __oni_env)}))),__oni_rt.Sc(263,__oni_rt.Return,__oni_rt.C(function(){return parts.join("&")},263))])};exports.constructURL=function (){var url_spec,l,rv,comp,i,qparts,part,query;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(275,function(_oniX){return url_spec=_oniX;},__oni_rt.C(function(){return exports.flatten(this.aobj)},274)),__oni_rt.Nb(function(){l=url_spec.length;rv=url_spec[0];},276),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=1;},287),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < l},279),__oni_rt.Nb(function(){return ++ i},279),__oni_rt.Nb(function(){comp=url_spec[i];},281),__oni_rt.Nb(function(){if(typeof comp != "string")return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Break();},0),this);},281),__oni_rt.If(__oni_rt.Sc(282,__oni_rt.infix['!='],__oni_rt.C(function(){return rv.charAt(rv.length - 1)},282),"/"),__oni_rt.Nb(function(){return rv+="/"},282)),__oni_rt.Sc(283,function(_oniX){return rv+=_oniX;},__oni_rt.If(__oni_rt.Sc(283,__oni_rt.infix['=='],__oni_rt.C(function(){return comp.charAt(0)},283),"/"),__oni_rt.C(function(){return comp.substr(1)},283),__oni_rt.Nb(function(){return comp},283))))),__oni_rt.Nb(function(){qparts=[];},288),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < l},288),__oni_rt.Nb(function(){return ++ i},288),__oni_rt.Sc(290,function(_oniX){return part=_oniX;},__oni_rt.C(function(){return exports.constructQueryString(url_spec[i])},289)),__oni_rt.Nb(function(){if(part.length)return __oni_rt.ex(__oni_rt.C(function(){return qparts.push(part)},291),this);},290)),__oni_rt.Sc(294,function(_oniX){return query=_oniX;},__oni_rt.C(function(){return qparts.join("&")},293)),__oni_rt.Nb(function(){if(query.length)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.If(__oni_rt.Sc(295,__oni_rt.infix['!='],__oni_rt.C(function(){return rv.indexOf("?")},295),__oni_rt.Nb(function(){return - 1},295)),__oni_rt.Nb(function(){return rv+="&"},296),__oni_rt.Nb(function(){return rv+="?"},298)),__oni_rt.Nb(function(){return rv+=query;},299)),this);},294),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},301)])};exports.isSameOrigin=function (url1,url2){var a1,a2;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(312,function(_oniX){return a1=_oniX;},__oni_rt.Sc(311,function(l){return l.authority;},__oni_rt.C(function(){return exports.parseURL(url1)},311))),__oni_rt.Nb(function(){if(! a1)return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return(true);},312),this);},312),__oni_rt.Sc(314,function(_oniX){return a2=_oniX;},__oni_rt.Sc(313,function(l){return l.authority;},__oni_rt.C(function(){return exports.parseURL(url2)},313))),__oni_rt.Nb(function(){return __oni_rt.Return(! a2 || (a1 == a2));},314)])};exports.canonicalizeURL=function (url,base){var a,pin,l,pout,c,i,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){if(__oni_rt.hostenv == "nodejs" && __oni_rt.G.process.platform == 'win32')return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Sc(330,function(_oniX){return url=_oniX;},__oni_rt.C(function(){return url.replace(/\\/g,"/")},330)),__oni_rt.Sc(331,function(_oniX){return base=_oniX;},__oni_rt.C(function(){return base.replace(/\\/g,"/")},331))),this);},328),__oni_rt.Sc(337,function(_oniX){return a=_oniX;},__oni_rt.C(function(){return exports.parseURL(url)},334)),__oni_rt.If(__oni_rt.Seq(4,__oni_rt.Seq(4,__oni_rt.Nb(function(){return base},337),__oni_rt.Sc(337,function(_oniX){return base=_oniX;},__oni_rt.C(function(){return exports.parseURL(base)},337))),__oni_rt.Nb(function(){return ! a.protocol || a.protocol == base.protocol},338)),__oni_rt.Seq(0,__oni_rt.Nb(function(){if(! a.directory && ! a.protocol)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return a.directory=base.directory;},340),__oni_rt.Nb(function(){if(! a.path && (a.query || a.anchor))return __oni_rt.ex(__oni_rt.Nb(function(){return a.file=base.file},342),this);},341)),this);else return __oni_rt.ex(__oni_rt.If(__oni_rt.Seq(4,__oni_rt.Nb(function(){return a.directory},344),__oni_rt.Sc(344,__oni_rt.infix['!='],__oni_rt.C(function(){return a.directory.charAt(0)},344),'/')),__oni_rt.Nb(function(){return a.directory=(base.directory || "/") + a.directory;},346)),this);},339),__oni_rt.Nb(function(){if(! a.protocol)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return a.protocol=base.protocol;},349),__oni_rt.Nb(function(){if(! a.authority)return __oni_rt.ex(__oni_rt.Nb(function(){return a.authority=base.authority},351),this);},350)),this);},348))),__oni_rt.Sc(357,function(_oniX){return pin=_oniX;},__oni_rt.C(function(){return a.directory.split("/")},356)),__oni_rt.Nb(function(){l=pin.length;pout=[];},358),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},367),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < l},359),__oni_rt.Nb(function(){return ++ i},359),__oni_rt.Nb(function(){c=pin[i];},361),__oni_rt.Nb(function(){if(c == ".")return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Cont();},0),this);},361),__oni_rt.Nb(function(){if(c == ".." && pout.length > 1)return __oni_rt.ex(__oni_rt.C(function(){return pout.pop()},363),this);else return __oni_rt.ex(__oni_rt.C(function(){return pout.push(c)},365),this);},362))),__oni_rt.Sc(367,function(_oniX){return a.directory=_oniX;},__oni_rt.C(function(){return pout.join("/")},367)),__oni_rt.Nb(function(){rv="";},371),__oni_rt.Nb(function(){if(a.protocol)return __oni_rt.ex(__oni_rt.Nb(function(){return rv+=a.protocol + ":"},371),this);},371),__oni_rt.Nb(function(){if(a.authority)return __oni_rt.ex(__oni_rt.Nb(function(){return rv+="//" + a.authority},373),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(a.protocol == "file")return __oni_rt.ex(__oni_rt.Nb(function(){return rv+="//"},375),this);},374),this);},372),__oni_rt.Nb(function(){return rv+=a.directory + a.file;},376),__oni_rt.Nb(function(){if(a.query)return __oni_rt.ex(__oni_rt.Nb(function(){return rv+="?" + a.query},377),this);},377),__oni_rt.Nb(function(){if(a.anchor)return __oni_rt.ex(__oni_rt.Nb(function(){return rv+="#" + a.anchor},378),this);},378),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},379)])};exports.jsonp=jsonp_hostenv;exports.getXDomainCaps=getXDomainCaps_hostenv;exports.request=request_hostenv;exports.makeMemoizedFunction=function (f,keyfn){var lookups_in_progress,memoizer;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){lookups_in_progress={};memoizer=function (){var key,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(429,function(_oniX){return key=_oniX;},__oni_rt.If(__oni_rt.Nb(function(){return keyfn},428),__oni_rt.C(function(){return keyfn.apply(this.tobj,this.aobj)},428),__oni_rt.Nb(function(){return this.aobj[0]},428))),__oni_rt.Nb(function(){rv=memoizer.db[key];},430),__oni_rt.Nb(function(){if(typeof rv !== 'undefined')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return(rv);},430),this);},430),__oni_rt.Nb(function(){if(! lookups_in_progress[key])return __oni_rt.ex(__oni_rt.Sc(434,function(_oniX){return lookups_in_progress[key]=_oniX;},__oni_rt.Spawn(434,__oni_rt.C(function(){return (function (args){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Sc(433,__oni_rt.Return,__oni_rt.Sc(433,function(_oniX){return memoizer.db[key]=_oniX;},__oni_rt.C(function(){return f.apply(this.tobj,args)},433)))])})(this.aobj)},434))),this);},431),__oni_rt.Try(0,__oni_rt.Sc(436,__oni_rt.Return,__oni_rt.C(function(){return lookups_in_progress[key].waitforValue()},436)),0,__oni_rt.If(__oni_rt.Sc(439,__oni_rt.infix['=='],__oni_rt.C(function(){return lookups_in_progress[key].waiting()},439),0),__oni_rt.Seq(0,__oni_rt.C(function(){return lookups_in_progress[key].abort()},440),__oni_rt.Nb(function(){return delete lookups_in_progress[key];},441))))])};memoizer.db={};return __oni_rt.Return(memoizer);},427)])};exports.eval=eval_hostenv;pendingLoads={};compiled_src_tag=/^\/\*\__oni_compiled_sjs_1\*\//;default_compiler.module_args=['module','exports','require','__onimodulename'];github_api="https://api.github.com/";github_opts={cbfield:"callback"};return exports.resolve=function (url,require_obj,parent,opts){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.Nb(function(){return require_obj=require_obj || exports.require;},800),__oni_rt.Sc(801,function(_oniX){return parent=_oniX;},__oni_rt.Seq(2,__oni_rt.Nb(function(){return parent},801),__oni_rt.C(function(){return getTopReqParent_hostenv()},801))),__oni_rt.Nb(function(){return opts=opts || {};},802),__oni_rt.Sc(803,__oni_rt.Return,__oni_rt.C(function(){return resolve(url,require_obj,parent,opts)},803))])};},77),__oni_rt.Sc(821,function(_oniX){return exports.require=_oniX;},__oni_rt.Fcall(0,821,__oni_rt.Nb(function(){return makeRequire},821),__oni_rt.C(function(){return getTopReqParent_hostenv()},821))),__oni_rt.Nb(function(){exports.require.modules['builtin:apollo-sys.sjs']={id:'builtin:apollo-sys.sjs',exports:exports,loaded_from:"[builtin]",loaded_by:"[toplevel]",required_by:{"[toplevel]":1}};return exports.init=function (cb){return __oni_rt.exseq(arguments,this,'apollo-sys-common.sjs',[1,__oni_rt.C(function(){return init_hostenv()},832),__oni_rt.C(function(){return cb()},833)])};},829)])
var location,jsonp_req_count,jsonp_cb_obj,XHR_caps,activex_xhr_ver,IE_resume_counter;function determineLocation(){var scripts,matches,i;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(! location)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return location={};},54),__oni_rt.Sc(56,function(_oniX){return scripts=_oniX;},__oni_rt.C(function(){return document.getElementsByTagName("script")},55)),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},65),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < scripts.length},56),__oni_rt.Nb(function(){return ++ i},56),__oni_rt.If(__oni_rt.Sc(57,function(_oniX){return matches=_oniX;},__oni_rt.C(function(){return /(.*)stratified(.*).js(\?.*)?$/.exec(scripts[i].src)},57)),__oni_rt.Seq(0,__oni_rt.Sc(58,function(_oniX){return location.location=_oniX;},__oni_rt.C(function(){return exports.canonicalizeURL(matches[1] + "modules/",document.location.href)},58)),__oni_rt.Sc(59,function(_oniX){return location.requirePrefix=_oniX;},__oni_rt.C(function(){return scripts[i].getAttribute("require-prefix")},59)),__oni_rt.Sc(60,function(_oniX){return location.req_base=_oniX;},__oni_rt.Seq(2,__oni_rt.C(function(){return scripts[i].getAttribute("req-base")},60),__oni_rt.Nb(function(){return document.location.href},60))),__oni_rt.Sc(61,function(_oniX){return location.main=_oniX;},__oni_rt.C(function(){return scripts[i].getAttribute("main")},61)),__oni_rt.Nb(function(){return __oni_rt.Break();},0)))))),this);},53),__oni_rt.Nb(function(){return __oni_rt.Return(location);},66)])}function jsonp_hostenv(url,settings){var opts;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Sc(102,function(_oniX){return opts=_oniX;},__oni_rt.C(function(){return exports.mergeObjects({iframe:false,cbfield:"callback"},settings)},100)),__oni_rt.Sc(102,function(_oniX){return url=_oniX;},__oni_rt.C(function(){return exports.constructURL(url,opts.query)},102)),__oni_rt.Nb(function(){if(opts.iframe || opts.forcecb)return __oni_rt.ex(__oni_rt.Sc(104,__oni_rt.Return,__oni_rt.C(function(){return jsonp_iframe(url,opts)},104)),this);else return __oni_rt.ex(__oni_rt.Sc(106,__oni_rt.Return,__oni_rt.C(function(){return jsonp_indoc(url,opts)},106)),this);},103)])}function jsonp_indoc(url,opts){var cb,cb_query,elem,complete,readystatechange,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(! window[jsonp_cb_obj])return __oni_rt.ex(__oni_rt.Nb(function(){return window[jsonp_cb_obj]={}},113),this);},112),__oni_rt.Nb(function(){cb="cb" + (jsonp_req_count++ );cb_query={};return cb_query[opts.cbfield]=jsonp_cb_obj + "." + cb;},115),__oni_rt.Sc(117,function(_oniX){return url=_oniX;},__oni_rt.C(function(){return exports.constructURL(url,cb_query)},117)),__oni_rt.Sc(119,function(_oniX){return elem=_oniX;},__oni_rt.C(function(){return document.createElement("script")},118)),__oni_rt.C(function(){return elem.setAttribute("src",url)},119),__oni_rt.C(function(){return elem.setAttribute("async","async")},120),__oni_rt.C(function(){return elem.setAttribute("type","text/javascript")},121),__oni_rt.Nb(function(){complete=false;},123),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return window[jsonp_cb_obj][cb]=resume;},124),__oni_rt.Fcall(1,125,__oni_rt.Sc(125,function(l){return [l,'appendChild'];},__oni_rt.Sc(125,function(l, idx){return l[idx];},__oni_rt.C(function(){return document.getElementsByTagName("head")},125),0)),__oni_rt.Nb(function(){return elem},125)),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Nb(function(){if(elem.addEventListener)return __oni_rt.ex(__oni_rt.C(function(){return elem.addEventListener("error",resume,false)},129),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){readystatechange=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(elem.readyState == 'loaded' && ! complete)return __oni_rt.ex(__oni_rt.C(function(){return resume()},133),this);},132)])};},134),__oni_rt.C(function(){return elem.attachEvent("onreadystatechange",readystatechange)},134)),this);},128),__oni_env)}, function() {}),0,__oni_rt.Nb(function(){if(elem.removeEventListener)return __oni_rt.ex(__oni_rt.C(function(){return elem.removeEventListener("error",resume,false)},139),this);else return __oni_rt.ex(__oni_rt.C(function(){return elem.detachEvent("onreadystatechange",readystatechange)},141),this);},138)),this)},144),__oni_rt.Sc(144,__oni_rt.Throw,__oni_rt.Fcall(2,144,__oni_rt.Nb(function(){return Error},144),__oni_rt.Nb(function(){return "Could not complete JSONP request to '" + url + "'"},144)),144,'apollo-sys-xbrowser.sjs')),__oni_env)}, function() {rv=arguments[0];}),0,__oni_rt.Seq(0,__oni_rt.C(function(){return elem.parentNode.removeChild(elem)},147),__oni_rt.Nb(function(){return delete window[jsonp_cb_obj][cb];},148))),this)},150),__oni_rt.Nb(function(){complete=true;return __oni_rt.Return(rv);},150)])}function jsonp_iframe(url,opts){var cb,cb_query,iframe,doc,rv;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){cb=opts.forcecb || "R";cb_query={};},156),__oni_rt.Nb(function(){if(opts.cbfield)return __oni_rt.ex(__oni_rt.Nb(function(){return cb_query[opts.cbfield]=cb},158),this);},157),__oni_rt.Sc(159,function(_oniX){return url=_oniX;},__oni_rt.C(function(){return exports.constructURL(url,cb_query)},159)),__oni_rt.Sc(161,function(_oniX){return iframe=_oniX;},__oni_rt.C(function(){return document.createElement("iframe")},160)),__oni_rt.Fcall(1,161,__oni_rt.Sc(161,function(l){return [l,'appendChild'];},__oni_rt.Sc(161,function(l, idx){return l[idx];},__oni_rt.C(function(){return document.getElementsByTagName("head")},161),0)),__oni_rt.Nb(function(){return iframe},161)),__oni_rt.Nb(function(){doc=iframe.contentWindow.document;},163),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.C(function(){return doc.open()},164),__oni_rt.Nb(function(){return iframe.contentWindow[cb]=resume;},165),__oni_rt.C(function(){return __oni_rt.Hold(0)},168),__oni_rt.C(function(){return doc.write("\x3Cscript type='text/javascript' src=\"" + url + "\">\x3C/script>")},169),__oni_rt.C(function(){return doc.close()},170)),__oni_env)}, function() {rv=arguments[0];}),0,__oni_rt.C(function(){return iframe.parentNode.removeChild(iframe)},173)),this)},177),__oni_rt.C(function(){return __oni_rt.Hold(0)},177),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},178)])}function getXHRCaps(){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(! XHR_caps)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return XHR_caps={};},187),__oni_rt.Nb(function(){if(__oni_rt.G.XMLHttpRequest)return __oni_rt.ex(__oni_rt.Nb(function(){return XHR_caps.XHR_ctor=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Sc(190,__oni_rt.Return,__oni_rt.Fcall(2,190,__oni_rt.Nb(function(){return XMLHttpRequest},190)))])}},190),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return XHR_caps.XHR_ctor=function (){var req,v;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(typeof activex_xhr_ver !== 'undefined')return __oni_rt.ex(__oni_rt.Sc(194,__oni_rt.Return,__oni_rt.Fcall(2,194,__oni_rt.Nb(function(){return ActiveXObject},194),__oni_rt.Nb(function(){return activex_xhr_ver},194))),this);},193),__oni_rt.ForIn(__oni_rt.Nb(function(){return {"MSXML2.XMLHTTP.6.0":1,"MSXML2.XMLHTTP.3.0":1,"MSXML2.XMLHTTP":1}},199),function(__oni_env, _oniY) { return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return v=_oniY},208),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Sc(202,function(_oniX){return req=_oniX;},__oni_rt.Fcall(2,201,__oni_rt.Nb(function(){return ActiveXObject},201),__oni_rt.Nb(function(){return v},201))),__oni_rt.Nb(function(){activex_xhr_ver=v;return __oni_rt.Return(req);},202)),function(__oni_env,e){return __oni_rt.ex(0,__oni_env)},0)), __oni_env)}),__oni_rt.Sc(207,__oni_rt.Throw,__oni_rt.Fcall(2,207,__oni_rt.Nb(function(){return Error},207),"Browser does not support XMLHttpRequest"),207,'apollo-sys-xbrowser.sjs')])}},208),this);},189),__oni_rt.Sc(211,function(_oniX){return XHR_caps.XHR_CORS=_oniX;},__oni_rt.Sc(211,__oni_rt.infix['in'],"withCredentials",__oni_rt.C(function(){return XHR_caps.XHR_ctor()},211))),__oni_rt.Nb(function(){if(! XHR_caps.XHR_CORS)return __oni_rt.ex(__oni_rt.Nb(function(){return XHR_caps.XDR=(typeof __oni_rt.G.XDomainRequest !== 'undefined')},213),this);},212),__oni_rt.Nb(function(){return XHR_caps.CORS=(XHR_caps.XHR_CORS || XHR_caps.XDR)?"CORS":"none";},214)),this);},186),__oni_rt.Nb(function(){return __oni_rt.Return(XHR_caps);},216)])}function getXDomainCaps_hostenv(){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Sc(225,__oni_rt.Return,__oni_rt.Sc(225,function(l){return l.CORS;},__oni_rt.C(function(){return getXHRCaps()},225)))])}function getTopReqParent_hostenv(){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Sc(233,__oni_rt.Return,__oni_rt.Sc(233,function(l){return l.req_base;},__oni_rt.C(function(){return determineLocation()},233)))])}function resolveSchemelessURL_hostenv(url_string,req_obj,parent){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(req_obj.path && req_obj.path.length)return __oni_rt.ex(__oni_rt.Sc(246,function(_oniX){return url_string=_oniX;},__oni_rt.C(function(){return exports.constructURL(req_obj.path,url_string)},246)),this);},245),__oni_rt.Sc(247,__oni_rt.Return,__oni_rt.C(function(){return exports.canonicalizeURL(url_string,parent)},247))])}function request_hostenv(url,settings){var opts,caps,req,h,error,txt,err;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Sc(315,function(_oniX){return opts=_oniX;},__oni_rt.C(function(){return exports.mergeObjects({method:"GET",body:null,response:'string',throwing:true},settings)},314)),__oni_rt.Sc(315,function(_oniX){return url=_oniX;},__oni_rt.C(function(){return exports.constructURL(url,opts.query)},315)),__oni_rt.Sc(318,function(_oniX){return caps=_oniX;},__oni_rt.C(function(){return getXHRCaps()},317)),__oni_rt.If(__oni_rt.Seq(2,__oni_rt.Nb(function(){return ! caps.XDR},318),__oni_rt.C(function(){return exports.isSameOrigin(url,document.location)},318)),__oni_rt.Seq(0,__oni_rt.Sc(320,function(_oniX){return req=_oniX;},__oni_rt.C(function(){return caps.XHR_ctor()},319)),__oni_rt.C(function(){return req.open(opts.method,url,true,opts.username || "",opts.password || "")},320)),__oni_rt.Seq(0,__oni_rt.Sc(324,function(_oniX){return req=_oniX;},__oni_rt.Fcall(2,324,__oni_rt.Nb(function(){return XDomainRequest},324))),__oni_rt.C(function(){return req.open(opts.method,url)},325))),__oni_rt.Nb(function(){var resume;return __oni_rt.ex(__oni_rt.Try(0,__oni_rt.Suspend(function(__oni_env,_oniX){resume=_oniX;return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){if(typeof req.onerror !== 'undefined')return __oni_rt.ex(__oni_rt.Nb(function(){req.onload=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume()},330)])};return req.onerror=function (){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.C(function(){return resume(true)},331)])};},330),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return req.onreadystatechange=function (evt){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(req.readyState != 4)return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return();},336),this);else return __oni_rt.ex(__oni_rt.C(function(){return resume()},338),this);},335)])};},339),this);},329),__oni_rt.Nb(function(){if(opts.headers && req.setRequestHeader)return __oni_rt.ex(__oni_rt.ForIn(__oni_rt.Nb(function(){return opts.headers},346),function(__oni_env, _oniY) { return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){return h=_oniY},352),__oni_rt.C(function(){return req.setRequestHeader(h,opts.headers[h])},347)), __oni_env)}),this);},342),__oni_rt.Nb(function(){if(opts.mime && req.overrideMimeType)return __oni_rt.ex(__oni_rt.C(function(){return req.overrideMimeType(opts.mime)},349),this);},348),__oni_rt.C(function(){return req.send(opts.body)},350)),__oni_env)}, function() {error=arguments[0];}),0,0,__oni_rt.C(function(){return req.abort()},353)),this)},357),__oni_rt.If(__oni_rt.Seq(2,__oni_rt.Nb(function(){return error},357),__oni_rt.Seq(4,__oni_rt.Nb(function(){return typeof req.status !== 'undefined'},358),__oni_rt.Sc(359,function(r){return ! r},__oni_rt.Sc(359,__oni_rt.infix['in'],__oni_rt.Fcall(1,359,__oni_rt.Sc(359,function(l){return [l,'charAt'];},__oni_rt.C(function(){return req.status.toString()},359)),0),__oni_rt.Nb(function(){return {'0':1,'2':1}},359))))),__oni_rt.Nb(function(){if(opts.throwing)return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){txt="Failed " + opts.method + " request to '" + url + "'";},362),__oni_rt.Nb(function(){if(req.statusText)return __oni_rt.ex(__oni_rt.Nb(function(){return txt+=": " + req.statusText},362),this);},362),__oni_rt.Nb(function(){if(req.status)return __oni_rt.ex(__oni_rt.Nb(function(){return txt+=" (" + req.status + ")"},363),this);},363),__oni_rt.Sc(365,function(_oniX){return err=_oniX;},__oni_rt.Fcall(2,364,__oni_rt.Nb(function(){return Error},364),__oni_rt.Nb(function(){return txt},364))),__oni_rt.Nb(function(){err.status=req.status;return err.data=req.responseText;},365),__oni_rt.Sc(367,__oni_rt.Throw,__oni_rt.Nb(function(){return err},367),367,'apollo-sys-xbrowser.sjs')),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(opts.response == 'string')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return("");},370),this);},369),this);},360)),__oni_rt.Nb(function(){if(opts.response == 'string')return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return(req.responseText);},375),this);else return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.Return({content:req.responseText,getHeader:function(name){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[33,__oni_rt.C(function(){return req.getResponseHeader(name)},381)])}});},381),this);},374)])}function getHubs_hostenv(){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Sc(406,__oni_rt.Return,__oni_rt.Sc(406,__oni_rt.Arr,__oni_rt.Sc(395,__oni_rt.Arr,"sjs:",__oni_rt.If(__oni_rt.Sc(390,function(l){return l.location;},__oni_rt.C(function(){return determineLocation()},390)),__oni_rt.Sc(391,function(l){return l.location;},__oni_rt.C(function(){return determineLocation()},391)),__oni_rt.Nb(function(){return {src:function (path){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Sc(393,__oni_rt.Throw,__oni_rt.Fcall(2,393,__oni_rt.Nb(function(){return Error},393),__oni_rt.Nb(function(){return "Can't load module '" + path + "': The location of the StratifiedJS standard module lib is unknown - it can only be inferred automatically if you load stratified.js in the normal way through a <script> element."},394)),393,'apollo-sys-xbrowser.sjs')])}}},395))),__oni_rt.Nb(function(){return ["github:",{src:github_src_loader}]},396),__oni_rt.Nb(function(){return ["http:",{src:http_src_loader}]},397),__oni_rt.Nb(function(){return ["https:",{src:http_src_loader}]},398),__oni_rt.Nb(function(){return ["file:",{src:http_src_loader}]},403),__oni_rt.Nb(function(){return ["x-wmapp1:",{src:http_src_loader}]},404),__oni_rt.Nb(function(){return ["local:",{src:http_src_loader}]},406)))])}function getExtensions_hostenv(){return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){return __oni_rt.Return({'sjs':default_compiler,'app!sjs':default_compiler,'api':default_compiler,'js':function (src,descriptor){var f;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Sc(423,function(_oniX){return f=_oniX;},__oni_rt.Fcall(2,422,__oni_rt.Nb(function(){return Function},422),"module","exports",__oni_rt.Nb(function(){return src},422))),__oni_rt.C(function(){return f.apply(descriptor.exports,[descriptor,descriptor.exports])},423)])},'html':html_sjs_extractor});},427)])}function eval_hostenv(code,settings){var filename,mode,js;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){if(__oni_rt.UA == "msie" && __oni_rt.G.execScript)return __oni_rt.ex(__oni_rt.Sc(435,__oni_rt.Return,__oni_rt.C(function(){return eval_msie(code,settings)},435)),this);},434),__oni_rt.Nb(function(){filename=(settings && settings.filename) || "sjs_eval_code";},438),__oni_rt.Sc(438,function(_oniX){return filename=_oniX;},__oni_rt.Sc(438,__oni_rt.join_str,"'",__oni_rt.C(function(){return filename.replace(/\'/g,'\\\'')},438),"'")),__oni_rt.Nb(function(){mode=(settings && settings.mode) || "normal";},440),__oni_rt.Sc(441,function(_oniX){return js=_oniX;},__oni_rt.C(function(){return __oni_rt.c1.compile(code,{filename:filename,mode:mode})},440)),__oni_rt.Sc(441,__oni_rt.Return,__oni_rt.C(function(){return __oni_rt.G.eval(js)},441))])}function eval_msie(code,settings){var filename,mode,rc,js,rv,isexception;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Nb(function(){filename=(settings && settings.filename) || "sjs_eval_code";},454),__oni_rt.Sc(454,function(_oniX){return filename=_oniX;},__oni_rt.Sc(454,__oni_rt.join_str,"'",__oni_rt.C(function(){return filename.replace(/\'/g,'\\\'')},454),"'")),__oni_rt.Nb(function(){mode=(settings && settings.mode) || "normal";},456),__oni_rt.Try(0,__oni_rt.Seq(0,__oni_rt.Suspend(function(__oni_env,resume){return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){rc=++ IE_resume_counter;return __oni_rt.IE_resume[rc]=resume;},459),__oni_rt.Sc(463,function(_oniX){return js=_oniX;},__oni_rt.C(function(){return __oni_rt.c1.compile("try{" + code + "\n}catchall(rv) { spawn(hold(0),__oni_rt.IE_resume[" + rc + "](rv[0],rv[1])) }",{filename:filename,mode:mode})},462)),__oni_rt.C(function(){return __oni_rt.G.execScript(js)},463)),__oni_env)}, function() {rv=arguments[0];isexception=arguments[1];}),__oni_rt.Nb(function(){if(isexception)return __oni_rt.ex(__oni_rt.Sc(465,__oni_rt.Throw,__oni_rt.Nb(function(){return rv},465),465,'apollo-sys-xbrowser.sjs'),this);},465)),0,__oni_rt.Nb(function(){return delete __oni_rt.IE_resume[rc];},468)),__oni_rt.Nb(function(){return __oni_rt.Return(rv);},470)])}function init_hostenv(){}function runScripts(){var scripts,ss,s,i,s,m,content,descriptor,f,i,mainModule;return __oni_rt.exseq(arguments,this,'apollo-sys-xbrowser.sjs',[1,__oni_rt.Sc(492,function(_oniX){return scripts=_oniX;},__oni_rt.C(function(){return document.getElementsByTagName("script")},483)),__oni_rt.Nb(function(){ss=[];},493),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},500),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < scripts.length},493),__oni_rt.Nb(function(){return ++ i},493),__oni_rt.Nb(function(){s=scripts[i];},495),__oni_rt.If(__oni_rt.Sc(495,__oni_rt.infix['=='],__oni_rt.C(function(){return s.getAttribute("type")},495),"text/sjs"),__oni_rt.C(function(){return ss.push(s)},496)))),__oni_rt.Seq(0,__oni_rt.Nb(function(){i=0;},522),__oni_rt.Loop(0,__oni_rt.Nb(function(){return i < ss.length},500),__oni_rt.Nb(function(){return ++ i},500),__oni_rt.Nb(function(){s=ss[i];},502),__oni_rt.Sc(504,function(_oniX){return m=_oniX;},__oni_rt.C(function(){return s.getAttribute("module")},502)),__oni_rt.Nb(function(){content=s.textContent || s.innerHTML;},505),__oni_rt.Nb(function(){if(__oni_rt.UA == "msie")return __oni_rt.ex(__oni_rt.Sc(507,function(_oniX){return content=_oniX;},__oni_rt.C(function(){return content.replace(/\r\n/,"")},507)),this);},505),__oni_rt.Nb(function(){if(m)return __oni_rt.ex(__oni_rt.Nb(function(){return __oni_rt.modsrc[m]=content},510),this);else return __oni_rt.ex(__oni_rt.Seq(0,__oni_rt.Nb(function(){descriptor={id:document.location.href + "_inline_sjs_" + (i + 1)};return require.main=descriptor;},515),__oni_rt.Sc(518,function(_oniX){return f=_oniX;},__oni_rt.C(function(){return exports.eval("(function(module, __onimodulename){" + content + "\n})",{filename:("module "+(descriptor.id))})},517)),__oni_rt.C(function(){return f(descriptor)},518)),this);},509))),__oni_rt.Sc(523,function(_oniX){return mainModule=_oniX;},__oni_rt.Sc(522,function(l){return l.main;},__oni_rt.C(function(){return determineLocation()},522))),__oni_rt.Nb(function(){if(mainModule)return __oni_rt.ex(__oni_rt.C(function(){return require(mainModule,{main:true})},524),this);},523)])}__oni_rt.exseq(this.arguments,this,'apollo-sys-xbrowser.sjs',[24,__oni_rt.If(__oni_rt.Sc(72,function(l){return l.requirePrefix;},__oni_rt.C(function(){return determineLocation()},72)),__oni_rt.Sc(73,function(l, r){return l[0][l[1]]=r;},__oni_rt.Sc(73,function(l, idx){return [l, idx];},__oni_rt.Nb(function(){return __oni_rt.G},73),__oni_rt.Sc(73,function(l){return l.requirePrefix;},__oni_rt.C(function(){return determineLocation()},73))),__oni_rt.Nb(function(){return {require:__oni_rt.sys.require}},73)),__oni_rt.Nb(function(){return __oni_rt.G.require=__oni_rt.sys.require},76)),__oni_rt.Nb(function(){jsonp_req_count=0;jsonp_cb_obj="_oni_jsonpcb";IE_resume_counter=0;return __oni_rt.IE_resume={};},110),__oni_rt.Nb(function(){if(! __oni_rt.G.__oni_rt_no_script_load)return __oni_rt.ex(__oni_rt.Nb(function(){if(document.readyState === "complete")return __oni_rt.ex(__oni_rt.C(function(){return runScripts()},529),this);else return __oni_rt.ex(__oni_rt.Nb(function(){if(__oni_rt.G.addEventListener)return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.G.addEventListener("load",runScripts,true)},534),this);else return __oni_rt.ex(__oni_rt.C(function(){return __oni_rt.G.attachEvent("onload",runScripts)},536),this);},533),this);},528),this);},481)])})({})