// test async.js

var async = require(__dirname + '/async.js');

try {
	async.series([
		function(){
			console.log("one");
			  var e = new Error('dummy');
  var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
      .replace(/^\s+at\s+/gm, '')
      .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
      .split('\n');
  console.log(stack);

		},
		function() {
			console.log("two");
		}
		]);
} catch(e) {
	console.log("Exception: " + e.stack);
}