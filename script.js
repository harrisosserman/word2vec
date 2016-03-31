//steps:
// Use negative sampling!
//1.  Break the entire vocabulary into a map D where D contains map of (word, context) for all words and contexts
// Make another map D' for the map (word, context) for all words and contexts not in the corpus
// 2.  Pr(Z = 1 | (w, c)) = probability that a pair (w,c) is in the corpus
// Pr(Z = 0 | (w, c)) = probability that a pair (w,c) is not in the corpus
// 3.  Pr(Z = 1 | (w, c)) = (1/(1 + e^(-vcT * vw)))
// 4.  31:39 into https://www.youtube.com/watch?v=nuirUEmbaJU explains the combined probability function
// 5.  When running the function that you optimize, for every pair (w,c) that is in the corpus, use k pairs (w,c) that are not in the corpus (google found that optimization worked)

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var math = require('mathjs');

const MAX_SENTENCE_LENGTH = 1000;
const TRAINING_ITERATIONS = 10;
const LAYER_1_SIZE = 100;
const BAG_OF_WORDS_WINDOW = 5;
const K_VALUE_FOR_WORDMAP_D_PRIME = 5;
const LEARNING_RATE = .05;

var filePath = path.join(__dirname, 'corpus.txt');
var corpus = "";
var context = 2;  //context is the number of words +- a word that we will look at
var wordMapD = {};	//maps a word to its frequency
var wordMapDPrime = {};	//word context pairs that are not in corpus
var sizeOfVocabulary = 0;	//gets set by the number of keys in wordMapD

fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
    if (!err){
    	corpus = data;
    	finishReadingFile();
    } else{
        console.log(err);
    }
});

var finishReadingFile = function() {
	// break into words and count the number of times each word exists
	var splitWords = corpus.split(" ");
	var countItemsInWordMapD = 0;
	// to avoid having this run n^2 time, store temporary variables
	var prev2 = null, prev1 = null, current = null, next1 = null, next2 = null;
	splitWords.forEach(function(word) {
		next2 = word;
		if (current !== null) {
			if (!wordMapD[current])	wordMapD[current] = [];
			wordMapD[current].push([prev2, prev1, next1, next2]);	
			countItemsInWordMapD++;
		}
		prev2 = prev1;
		prev1 = current;
		current = next1;
		next1 = next2;
	});

	// generate wordmap D prime
	var countItemsInWordMapDPrime = 0;
	while (countItemsInWordMapDPrime < countItemsInWordMapD) {
		prev1 = splitWords[Math.round(Math.random() * splitWords.length)];
		prev2 = splitWords[Math.round(Math.random() * splitWords.length)];
		current = splitWords[Math.round(Math.random() * splitWords.length)];
		next1 = splitWords[Math.round(Math.random() * splitWords.length)];
		next2 = splitWords[Math.round(Math.random() * splitWords.length)];

		var contextsForWord = wordMapD[current];
		if (!contextsForWord) continue;
		var foundMatch = false;
		contextsForWord.forEach(function(listOfWords) {
			if (listOfWords[0] === prev1 && listOfWords[1] === prev2 && listOfWords[2] === next1 && listOfWords[3] === next2) {
				foundMatch = true;
			}
		});
		if (!foundMatch) {
			if (!wordMapDPrime[current]) wordMapDPrime[current] = [];
			wordMapDPrime[current].push([prev2, prev1, next1, next2]);	
			countItemsInWordMapDPrime++;
		}
	}
	console.log(wordMapDPrime)
	trainModel();
};

var trainModel = function() {
	var oldOutput, newOutput;
	var DMapKeys = _.keys(wordMapD);
	var DPrimeMapKeys = _.keys(wordMapDPrime);
	var context;
	sizeOfVocabulary = DMapKeys.length;

	//initialize W, W Prime, and H matrices with random values between [-1, 1]
	var W = [];	//sizeOfVocabulary x LAYER_1_SIZE
	var WPrime = []; //LAYER_1_SIZE x sizeOfVocabulary
	var H = [];	//LAYER_1_SIZE x 1
	for (var row = 0; row < sizeOfVocabulary; row++) {
		W[row] = [];
		for (var column = 0; column < LAYER_1_SIZE; column++) {
			var randValueW = Math.random();
			var isPositiveW = Math.random() >= 0.5 ? 1 : -1;
			W[row][column] = randValueW * isPositiveW;
		}
	}
	for (var row = 0; row < LAYER_1_SIZE; row++) {
		WPrime[row] = [];
		for (var column = 0; column < sizeOfVocabulary; column++) {
			var randValueWPrime = Math.random();
			var isPositiveWPrime = Math.random() >= 0.5 ? 1 : -1;
			WPrime[row][column] = randValueWPrime * isPositiveWPrime;
		}
	}
	var WPrimeTranspose = math.transpose(math.matrix(WPrime))._data;


	for (var k=0; k<LAYER_1_SIZE; k++) {
		var randValueH = Math.random();
		var isPositiveH = Math.random() >= 0.5 ? 1 : -1;
		H[k] = [randValueH * isPositiveH];
	}

	for(var iterationCount = 0; iterationCount < TRAINING_ITERATIONS; iterationCount++) {
		for (var middleWord=0; middleWord < sizeOfVocabulary; middleWord) {
			if (DMapKeys[middleWord]) {
				for (var k=0; k<wordMapD[DMapKeys[middleWord]].length; k++) {
					context = wordMapD[DMapKeys[middleWord]][k];
					var result = createXInputVector(context, DMapKeys);
					var X = result.xInput;
					var nonzeroRows = result.nonzeroRows;
					var Vc = math.matrix(W[nonzeroRows[0]]);	//initialize Vc to be the 0th context word W row
					for (c = 1; c < nonzeroRows.length; c++) {
						Vc = math.add(Vc, math.matrix(W[nonzeroRows[c]]));
					}
					Vc = math.transpose([Vc]);	//do a transpose at the end to convert Vc into p x 1 matrix
					Vw = math.matrix([WPrimeTranspose[middleWord]]);	//Vw is the ith row of WPrime where i = index of middle word
					console.log("Vc", math.matrix(Vc).size());
					console.log("Vw", Vw.size());
					console.log("Vw test: ", math.matrix([WPrimeTranspose[middleWord]]).size())
					console.log("WPrimeTranspose", math.matrix(WPrimeTranspose).size())


					var intermediateOutput = Math.log(1 / (1 + math.exp(math.multiply(Vw, math.multiply(Vc, -1)))._data));
					console.log("===intermediateOutput: ", intermediateOutput)
					
				}
			}
			// TODO: REFACTOR AND GET THIS TO WORK WITH DPRIME WORDS WITHOUT COPIED CODE
			// if (DPrimeMapKeys[middleWord]) {
			// 	for (var j=0; j<wordMapDPrime[DPrimeMapKeys[middleWord]]; j++) {
			// 		context = wordMapDPrime[DPrimeMapKeys[middleWord]];

			// 	}
			// }
		}
	}
};

var createXInputVector = function(context, keysFromWMap) {
	//TODO: creating xInput array is unnecessary, but is nice from an understanding point of view
	var outputArray = [];
	var nonzeroRows = [];
	for(var k=0; k<sizeOfVocabulary; k++) {
		if (context.indexOf(keysFromWMap[k]) > -1) {
			outputArray[k] = [1];
			nonzeroRows.push(k);
		} else {
			outputArray[k] = [0];
		}
	}
	return {
		xInput: outputArray,
		nonzeroRows: nonzeroRows
	};
}

var gradientAscentIteration = function() {

};
