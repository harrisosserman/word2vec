var math = require('mathjs');
var generateModel = require('./generateModel.js');
var assert = require('chai').assert;


describe('One iteration of algorithm', function() {
	var context, middleWord, DMapKeys, W, WPrime, WPrimeTranspose;
	var LAYER_1_SIZE = 10;	//in the main script, it's 100, but for the test, I wanted to make it smaller and simpler to reason about
	beforeEach(function() {
		context = ["hello", "my", "is", "harris"];
		middleWord = 8;	//middleword is the index of the middle word in DMapKeys
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
		var Vc = result.Vc;
		assert(Vc.length === LAYER_1_SIZE, 'the number of rows should equal the LAYER_1_SIZE')
		assert(Vc[0].length === 1, 'the number of columns should be 1')
		assert(Vc[0][0] === 4, 'each element should have a value of 4 because of matrix multiplication')
	});

	it('should generate Vw vector correctly', function() {
		var result = generateModel.createVcVw(context, middleWord, DMapKeys, W, WPrimeTranspose);
		var Vw = result.Vw;
		assert(Vw.length === 1, 'there should be only 1 row')
		assert(Vw[0].length === LAYER_1_SIZE, 'the numver of columns should equal the LAYER_1_SIZE')
		assert(Vw[0][0] === 0.5, 'each element should have a value of 0.5 because of how the WPrime was initialized')
	});

	it('should generate intermediate output each iteration correctly', function() {
		var result = generateModel.createVcVw(context, middleWord, DMapKeys, W, WPrimeTranspose);
		var checkScalarMultiplicationOutput = math.multiply(math.matrix(result.Vc), -1)._data;
		assert(checkScalarMultiplicationOutput.length === LAYER_1_SIZE, 'number of rows should not change')
		assert(checkScalarMultiplicationOutput[0].length === 1, 'number of columns should not change')
		assert(checkScalarMultiplicationOutput[0][0] === -4, "the elements should all be -4")
		
		var intermediateOutputForDMap = generateModel.generateIntermediateOutputForContext(result.Vc, result.Vw, -1);
		//intermediateOutputForDMap should be 18.233275993303582
		assert(intermediateOutputForDMap > 18, 'output should be a number greater than 18')
		assert(intermediateOutputForDMap < 19, 'output should be a number less than 19')

		var intermediateOutputForDPrimeMap = generateModel.generateIntermediateOutputForContext(result.Vc, result.Vw, 1);
		//intermediateOutputForDPrimeMap should be -21.11879184571426
		assert(intermediateOutputForDPrimeMap > -22, 'output should be a number greater than -22')
		assert(intermediateOutputForDPrimeMap < -21, 'output should be a number less than -21')
	});

	it('should update W matrix correctly after each iteration', function() {
		var result = generateModel.createVcVw(context, middleWord, DMapKeys, W, WPrimeTranspose);
		var intermediateOutputForDMap = generateModel.generateIntermediateOutputForContext(result.Vc, result.Vw, -1);
		generateModel.updateWMatrix(W, intermediateOutputForDMap, result.nonzeroRows, 0.05);
		assert(W.length === DMapKeys.length, 'W should have DMapKeys rows')
		assert(W[0].length === LAYER_1_SIZE, 'W should have HIDDEN_LAYER columns')
		assert(W[0][0] === 1, "rows that are not part of context should remain unchanged")
		assert(W[6][0] > 1 && W[6][0] < 2, "rows that are part of the context should be updated")
	});

	it('should update W Prime matrix correctly after each iteration', function() {
		var result = generateModel.createVcVw(context, middleWord, DMapKeys, W, WPrimeTranspose);
		var intermediateOutputForDMap = generateModel.generateIntermediateOutputForContext(result.Vc, result.Vw, -1);
		generateModel.updateWPrimeTransposeMatrix(WPrimeTranspose, intermediateOutputForDMap, result.nonzeroRows, 0.05);
		assert(WPrimeTranspose.length === DMapKeys.length, 'W Prime Tranpose should have DMapKeys rows')
		assert(WPrimeTranspose[0].length === LAYER_1_SIZE, 'W Prime Transpose should have HIDDEN_LAYER columns')
		assert(WPrimeTranspose[0][0] === 0.5, "rows that are not part of context should remain unchanged")
		assert(WPrimeTranspose[6][0] > 1 && W[6][0] < 2, "rows that are part of the context should be updated")		
	});

	it('should initialize W matrix correctly', function() {
		var W = [];
		generateModel.initializeWMatrix(W, 5, 10);
		assert(W.length === 5, 'there should be 5 rows in the W matrix');
		assert(W[0].length === 10, 'there should be 10 columns in the W matrix');
		for(var row = 0; row < 5; row++) {
			for (var column = 0; column < 10; column++) {
				assert(W[row][column] === 0, 'each element should be 0');
			}
		}
	});

	it('should initialize W Prime matrix correctly', function() {
		var WPrime = [];
		generateModel.initializeWPrimeMatrix(WPrime, 5, 10);
		assert(WPrime.length === 10, 'there should be 10 rows in the W Prime matrix');
		assert(WPrime[0].length === 5, 'there should be 5 columns in the W Prime matrix');
		for(var row = 0; row < 10; row++) {
			for (var column = 0; column < 5; column++) {
				assert(WPrime[row][column] === 0, 'each element should be 0');
			}
		}
	});	

	it('should initialize H matrix correctly', function() {
		var H = [];
		generateModel.initializeHMatrix(H, 10);
		assert(H.length === 10, 'H matrix should have 10 rows');
		assert(H[0].length === 1, 'each row in H should have just 1 element')
		for (var row = 0; row < 10; row++) {
			assert(H[row][0] === 0, 'each element should be 0');
		}
	});

});