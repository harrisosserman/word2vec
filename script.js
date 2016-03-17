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

const MAX_SENTENCE_LENGTH = 1000;
const TRAINING_ITERATIONS = 10;
const LAYER_1_SIZE = 100;
const BAG_OF_WORDS_WINDOW = 5;
const K_VALUE_FOR_WORDMAP_D_PRIME = 5;

var filePath = path.join(__dirname, 'corpus.txt');
var corpus = "";
var context = 2;  //context is the number of words +- a word that we will look at
var wordMapD = {};	//maps a word to its frequency
var wordMapDPrime = {};	//word context pairs that are not in corpus

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

	// console.log(wordMapD)

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


	// trainModel(splitWords);
};

var trainModel = function(splitWords) {

	var lastWordIndex = 0;
	var sentence = [];
	var localIterations = TRAINING_ITERATIONS;
	var sentencePosition = 0;
	var neu1 = [];
	var neu1e = [];
	var nextRandom = 1;
	var randomPositionInSentence = 0;
	var syn0 = [];	//TODO: FIGURE OUT IF SYN0 IS A 2D ARRAY, AND IF IT IS, INIALIZE AS SUCH

	while(true) {

		if (sentence.length === 0) {
			for(var k=lastWordIndex; k<splitWords.length; k++) {
				var word = splitWords[k];
				if (sentence.length < MAX_SENTENCE_LENGTH) {
					//tie the sentence index to the frequency that the word occurs
					sentence[sentence.length] = wordMap[word];	
				} else {
					break;
				}
				lastWordIndex++;
			}
		}
		if (lastWordIndex === splitWords.length) {
			if (localIterations === 0) {
				//stop iterating once you've gone through the entire list TRAINING_ITERATIONS times
				break;
			} else {
				lastWordIndex = 0;
				sentence = [];
				continue;
			}
		}
		sentencePosition = 0;
		for (var c = 0; c < LAYER_1_SIZE; c++) neu1[c] = 0;
    	for (var c = 0; c < LAYER_1_SIZE; c++) neu1e[c] = 0;
    	nextRandom = Math.random() * 25214903917;	//just tryna get a random number
    	randomPositionInSentence = nextRandom % BAG_OF_WORDS_WINDOW;
    	var cw = 0;
    	for (var count=randomPositionInSentence; count < BAG_OF_WORDS_WINDOW * 2 + 1; count++) {
    		if (count === BAG_OF_WORDS_WINDOW) continue;
    		var windowIndex = sentencePosition - BAG_OF_WORDS_WINDOW + count;
    		if (windowIndex < 0 || windowIndex >= sentence.length) continue;
    		for (var k = 0; k < LAYER_1_SIZE; k++) neu1[k] += syn0[k + sentence[windowIndex] * LAYER_1_SIZE];
    	}



		sentencePosition++;
	}
};
