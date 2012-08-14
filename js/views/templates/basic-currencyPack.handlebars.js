
Handlebars.templates = Handlebars.templates || {};
Handlebars.templates['basic-currencyPack'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;


  buffer += "<div class=\"visual\">\n    <img src=\"";
  foundHelper = helpers.src;
  stack1 = foundHelper || depth0.src;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "src", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\">\n    <img src=\"";
  foundHelper = helpers.currency;
  stack1 = foundHelper || depth0.currency;
  stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.image);
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "currency.image", { hash: {} }); }
  buffer += escapeExpression(stack1) + "\" class=\"currency\">\n    <h2>";
  foundHelper = helpers.amount;
  stack1 = foundHelper || depth0.amount;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "amount", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</h2>\n</div>\n<h1 class=\"content\">";
  foundHelper = helpers.name;
  stack1 = foundHelper || depth0.name;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
  buffer += escapeExpression(stack1) + "</h1>\n<div class=\"buy\">\n    <span class=\"price\">";
  foundHelper = helpers.price;
  stack1 = foundHelper || depth0.price;
  if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
  else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "price", { hash: {} }); }
  buffer += escapeExpression(stack1) + "$</span>\n</div>\n";
  return buffer;});
