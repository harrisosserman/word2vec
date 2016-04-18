// Create a corpus and put it into this directory with name corpus.txt
//steps:
//1.  Break the entire vocabulary into a map D where D contains map of (word, context) for all words and contexts
// Make another map D' for the map (word, context) for all words and contexts not in the corpus
// 2.  Pr(Z = 1 | (w, c)) = probability that a pair (w,c) is in the corpus
// Pr(Z = 0 | (w, c)) = probability that a pair (w,c) is not in the corpus
// 3.  Pr(Z = 1 | (w, c)) = (1/(1 + e^(-vcT * vw)))

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var math = require('mathjs');
var crypto = require('crypto-js');
var json2csv = require('json2csv');

const MAX_SENTENCE_LENGTH = 1000;
const TRAINING_ITERATIONS = 10;
const LAYER_1_SIZE = 100;
const BAG_OF_WORDS_WINDOW = 5;
const K_VALUE_FOR_WORDMAP_D_PRIME = 1;
const LEARNING_RATE = .05;

var filePath = path.join(__dirname, 'corpus.txt');
var corpus = "";
var context = 2;  //context is the number of words +- a word that we will look at
var wordMapD = {};	//maps a word to its frequency
var wordMapDPrime = {};	//word context pairs that are not in corpus
var sizeOfVocabulary = 0;	//gets set by the number of keys in wordMapD
var md5HashContext = {};	//md5 hash'ed list of [sorted context, word]

var readFile = function() {
	fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
	    if (!err){
	    	corpus = data;
	    	finishReadingFile();
	    } else{
	        console.log(err);
	    }
	});
}

var finishReadingFile = function() {
	// break into words and count the number of times each word exists
	var splitWords = corpus.split(" ");
	// Introduce subsampling by ignoring certain words in the corpus
	// Words that show up more frequently have a better chance of being filtered out
	var wordFrequency = {};
	splitWords.forEach(function(word) {
		if (!wordFrequency[word]) wordFrequency[word] = 0;
		wordFrequency[word]++;
	});

	console.log("total splitWords length: ", splitWords.length)
	var countItemsInWordMapD = 0;
	// to avoid having this run n^2 time, store temporary variables
	var prev2 = null, prev1 = null, current = null, next1 = null, next2 = null, word = null;
	for (var wordIndex = 0; wordIndex < splitWords.length; wordIndex++) {
		word = splitWords[wordIndex];
		// the word2vec paper uses 10^-5 as the numerator
		// determine the probability that you should subsample (ignore) this word
		// once probability is determined, then get a random number and if it is less than the probability, then remove the word
		// makes it very likely that high probability words will be removed
		var probabilityOfSubsampling = 1 - Math.sqrt(Math.pow(10, -5) / (wordFrequency[word] / splitWords.length));
		var shouldSubsample = Math.random() < probabilityOfSubsampling;
		if (shouldSubsample) {
			continue;
		}
		next2 = word;
		if (current !== null) {
			if (!wordMapD[current]) {
				wordMapD[current] = [];
			}	
			if (_.isFunction(wordMapD[current])) {
				//sometimes, the current word is a reserved word in JS (ex. word constructor)
				// if it is, just skip it
				return;
			}
			wordMapD[current].push([prev2, prev1, next1, next2]);	
			// insert the context into a hashmap so that I can more quickly figure out if that combination has already been put into list
			var wordContextForHash = [prev2, prev1, next1, next2].sort();
			wordContextForHash.push(current);
			var listToMD5 = crypto.MD5(JSON.stringify(wordContextForHash)).toString();
			md5HashContext[listToMD5] = true;

			countItemsInWordMapD++;
			if (wordIndex % 10000 === 0) {
				console.log("parsing file.  went through word count: ", wordIndex)
			}
		}
		prev2 = prev1;
		prev1 = current;
		current = next1;
		next1 = next2;		

	}

	splitWords.forEach(function(word, index) {
		next2 = word;
		if (current !== null) {
			if (!wordMapD[current]) {
				wordMapD[current] = [];
			}	
			if (_.isFunction(wordMapD[current])) {
				//sometimes, the current word is a reserved word in JS (ex. word constructor)
				// if it is, just skip it
				return;
			}
			wordMapD[current].push([prev2, prev1, next1, next2]);	
			// insert the context into a hashmap so that I can more quickly figure out if that combination has already been put into list
			var wordContextForHash = [prev2, prev1, next1, next2].sort();
			wordContextForHash.push(current);
			var listToMD5 = crypto.MD5(JSON.stringify(wordContextForHash)).toString();
			md5HashContext[listToMD5] = true;

			countItemsInWordMapD++;
			if (index % 10000 === 0) {
				console.log("parsing file.  went through word count: ", index)
			}
		}
		prev2 = prev1;
		prev1 = current;
		current = next1;
		next1 = next2;
	});

	console.log("starting to generate d prime")
	// generate wordmap D prime
	var numberOfWords = splitWords.length;
	var countItemsInWordMapDPrime = 0;
	while (countItemsInWordMapDPrime < K_VALUE_FOR_WORDMAP_D_PRIME * countItemsInWordMapD) {
		prev1 = splitWords[Math.round(Math.random() * numberOfWords)];
		prev2 = splitWords[Math.round(Math.random() * numberOfWords)];
		current = splitWords[Math.round(Math.random() * numberOfWords)];
		next1 = splitWords[Math.round(Math.random() * numberOfWords)];
		next2 = splitWords[Math.round(Math.random() * numberOfWords)];

		var contextsForWord = wordMapD[current];
		if (!contextsForWord) continue;
		var foundMatch = false;
		var potentialContextForHash = [prev1, prev2, next1, next2].sort();
		potentialContextForHash.push(current);
		var md5Hash = crypto.MD5(JSON.stringify(potentialContextForHash)).toString();
		if (md5HashContext[md5Hash]) {
			console.log("was true.  value is: ", md5HashContext[md5Hash], md5Hash)
			// this hash is in the WordMapD, so don't put it into D Prime
			continue;
		}
		if (!foundMatch) {
			if (!wordMapDPrime[current]) wordMapDPrime[current] = [];
			if (_.isFunction(wordMapDPrime[current])) {
				console.log("word is a function! ", current)
				return;
			}
			wordMapDPrime[current].push([prev2, prev1, next1, next2]);	
			countItemsInWordMapDPrime++;
		}
		if (countItemsInWordMapDPrime % 10000 === 0) {
			console.log("added words to D Prime.  count: ", countItemsInWordMapDPrime)
		}
	}
	trainModel();
};

var initializeWMatrix = function(W, sizeOfVocabulary, hiddenLayerSize) {
	for (var row = 0; row < sizeOfVocabulary; row++) {
		W[row] = [];
		for (var column = 0; column < hiddenLayerSize; column++) {
			W[row][column] = 0;
		}
	}
}

var initializeWPrimeMatrix = function(WPrime, sizeOfVocabulary, hiddenLayerSize) {
	for (var row = 0; row < hiddenLayerSize; row++) {
		WPrime[row] = [];
		for (var column = 0; column < sizeOfVocabulary; column++) {
			WPrime[row][column] = 0;
		}
	}
}

var initializeHMatrix = function(H, hiddenLayerSize) {
	for (var k=0; k<hiddenLayerSize; k++) {
		H[k] = [0];
	}
}

var trainModel = function() {
	var oldOutput, newOutput;
	var DMapKeys = _.keys(wordMapD);
	var DPrimeMapKeys = _.keys(wordMapDPrime);
	var context;
	sizeOfVocabulary = DMapKeys.length;

	console.log("starting to initialize W with size of vocabulary: ", sizeOfVocabulary)
	//initialize W, W Prime, and H matrices with random values between [-1, 1]
	var W = [];	//sizeOfVocabulary x LAYER_1_SIZE
	var WPrime = []; //LAYER_1_SIZE x sizeOfVocabulary
	var H = [];	//LAYER_1_SIZE x 1
	initializeWMatrix(W, sizeOfVocabulary, LAYER_1_SIZE);
	initializeWPrimeMatrix(WPrime, sizeOfVocabulary, LAYER_1_SIZE);
	var WPrimeTranspose = math.transpose(math.matrix(WPrime))._data;
	initializeHMatrix(H, LAYER_1_SIZE);

	for(var iterationCount = 0; iterationCount < TRAINING_ITERATIONS; iterationCount++) {
		writeVectorUpdatesToCSV(DMapKeys, WPrimeTranspose);
		for (var middleWord=0; middleWord < sizeOfVocabulary; middleWord++) {
			if (DMapKeys[middleWord]) {
				for (var k=0; k<wordMapD[DMapKeys[middleWord]].length; k++) {
					context = wordMapD[DMapKeys[middleWord]][k];
					var result = createVcVw(context, middleWord, DMapKeys, W, WPrimeTranspose);
					var intermediateOutput = generateIntermediateOutputForContext(result.Vc, result.Vw, -1);
					// It is possible that intermediateOutput is NaN
					// This can happen if we are taking the log of something very close to 0
					// See generateIntermediateOutputForContext for more information
					if (!isNaN(intermediateOutput) && isFinite(intermediateOutput)) {
						console.log("===intermediateOutput: ", intermediateOutput)
						updateWMatrix(W, intermediateOutput, result.nonzeroRows, LEARNING_RATE);
						updateWPrimeTransposeMatrix(WPrimeTranspose, intermediateOutput, result.nonzeroRows, LEARNING_RATE);						
					} 
				}
			}
			if (DPrimeMapKeys[middleWord]) {
				for (var j=0; j<wordMapDPrime[DPrimeMapKeys[middleWord]]; j++) {
					context = wordMapDPrime[DPrimeMapKeys[middleWord]];
					var result = createVcVw(context, middleWord, DMapKeys, W, WPrimeTranspose);
					var intermediateOutput = generateIntermediateOutputForContext(result.Vc, result.Vw, 1);	
					if (!isNaN(intermediateOutput) && isFinite(intermediateOutput)) {
						console.log("===intermediateOutput: ", intermediateOutput)
						updateWMatrix(W, intermediateOutput, result.nonzeroRows, LEARNING_RATE);
						updateWPrimeTransposeMatrix(WPrimeTranspose, intermediateOutput, result.nonzeroRows, LEARNING_RATE);	
					}							
				}
			}
		}
	}
};

var generateIntermediateOutputForContext = function(Vc, Vw, scalarMultiplier) {
	console.log(Math.exp(math.multiply(math.matrix(Vw), math.multiply(math.matrix(Vc), scalarMultiplier))._data));
	return Math.log(1 / (1 + math.exp(math.multiply(math.matrix(Vw), math.multiply(math.matrix(Vc), scalarMultiplier)))._data));
}

var createVcVw = function(context, middleWord, DMapKeys, W, WPrimeTranspose) {
	var result = createXInputVector(context, DMapKeys);
	var X = result.xInput;
	var nonzeroRows = result.nonzeroRows;
	var Vc = math.matrix(W[nonzeroRows[0]]);	//initialize Vc to be the 0th context word W row
	for (c = 1; c < nonzeroRows.length; c++) {
		Vc = math.add(Vc, math.matrix(W[nonzeroRows[c]]));
	}
	Vc = math.transpose([Vc]);	//do a transpose at the end to convert Vc into p x 1 matrix
	Vw = math.matrix([WPrimeTranspose[middleWord]]);	//Vw is the ith row of WPrime where i = index of middle word
	return {
		Vc: Vc,
		Vw: Vw._data,
		nonzeroRows: nonzeroRows
	};
};


var createXInputVector = function(context, keysFromWMap) {
	var outputArray = [];
	var nonzeroRows = [];
	for(var k=0; k<keysFromWMap.length; k++) {
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

var updateWMatrix = function(W, intermediateOutput, nonzeroRows, learningRate) {
	for (var c = 0; c < nonzeroRows.length; c++) {
		W[nonzeroRows[c]] = math.add(intermediateOutput * learningRate, W[nonzeroRows[c]])
	}
	//TODO: CHECK IF I SHOULD BE RETURNING THIS AS A MATH MATRIX OR NOT
	W = math.matrix(W);
};

var updateWPrimeTransposeMatrix = function(WPrimeTranspose, intermediateOutput, nonzeroRows, learningRate) {
	for (var c = 0; c < nonzeroRows.length; c++) {
		WPrimeTranspose[nonzeroRows[c]] = math.add(intermediateOutput * learningRate, WPrimeTranspose[nonzeroRows[c]])
	}	
	WPrimeTranspose = math.matrix(WPrimeTranspose);
}

var writeVectorUpdatesToCSV = function(DMapKeys, WPrimeTranspose) {
	var spreadsheetHeader = ['word'];
	for (var dimension = 0; dimension < LAYER_1_SIZE; dimension++) {
		spreadsheetHeader.push((dimension + 1).toString());
	}
	var spreadsheetData = [];
	for (var wordIndex = 0; wordIndex < sizeOfVocabulary; wordIndex++) {
		var wordForSpreadsheet = {
			word: DMapKeys[wordIndex]
		};
		WPrimeTranspose[wordIndex].forEach(function(coordinate, index) {
			wordForSpreadsheet[(index + 1).toString()] = coordinate;
		});
		spreadsheetData.push(wordForSpreadsheet);
	}
    json2csv({ data: spreadsheetData, fields: spreadsheetHeader}, function(err, successResult) {
        if (err) console.log("there is an error! ", err);
        console.log("wrote file")
        fs.writeFileSync('word_vectors.csv', successResult);
      }); 
}

module.exports ={
	createVcVw: createVcVw,
	readFile: readFile,
	generateIntermediateOutputForContext: generateIntermediateOutputForContext,
	updateWMatrix: updateWMatrix,
	updateWPrimeTransposeMatrix: updateWPrimeTransposeMatrix,
	initializeHMatrix: initializeHMatrix,
	initializeWMatrix: initializeWMatrix,
	initializeWPrimeMatrix: initializeWPrimeMatrix
};

