var math = require('mathjs');
var generateModel = require('./generateModel.js');


describe('One iteration of algorithm', function() {
	var context, middleWord, DMapKeys, W, WPrime, WPrimeTranspose;
	var LAYER_1_SIZE = 10;	//in the main script, it's 100, but for the test, I wanted to make it smaller and simpler to reason about
	beforeEach(function() {
		context = ["hello", "my", "is", "harris"];
		middleWord = "name";
		DMapKeys = ["if", "you", "ain't", "first", "you're", "last", "hello", "my", "name", "is", "harris"];
		W = [];
		for (var row = 0; row < DMapKeys.length; row++) {
			W[row] = []
			for (var column = 0; column < LAYER_1_SIZE; column++) {
				W[row].push(1);
			}
		}

		WPrime = [];
		for (var row = 0; row < LAYER_1_SIZE; row++) {
			WPrime[row] = [];
			for (var column = 0; column < DMapKeys.length; column++) {
				WPrime[row].push(0.5);
			}
		}

		WPrimeTranspose = math.transpose(math.matrix(WPrime))._data;
	});

	it('should generate Vc vector correctly', function() {
		var result = generateModel.createVcVw(context, middleWord, DMapKeys, W, WPrimeTranspose);
		console.log(result);
		assert(true);

	});

});