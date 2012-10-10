var surface   = require('apollo:surface/base');
var bootstrap = require('apollo:surface/bootstrap');
var widgets   = require('apollo:surface/bootstrap-widgets');

var ui = widgets.ButtonDropdown(
  'Action',
  [ 
    ['Action', 'action'],
    ['Another action', 'another_action'],
    ['Something else here', 'third_action']
  ]
);

var bs_container = bootstrap.Container();
bs_container.append(ui);
surface.root.append(bs_container);

while (1) {
  var command = ui.waitforCommand();
  bs_container.append(surface.Html("<div>You clicked #{command}</div>"));
}