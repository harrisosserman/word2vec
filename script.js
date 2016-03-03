//steps:
// 1.  read file and break into map of map[word] = frequencyOfWord
// 2.  Create binary Huffman tree using the word counts.  Frequent words will have short uniqe binary codes -- seems unnecessary if not using hierarchical softmax
// 3.  Read over the trainModelThread code in word2vec

var fs = require('fs');
var path = require('path');
var _ = require('lodash');

const MAX_SENTENCE_LENGTH = 1000;
const TRAINING_ITERATIONS = 10;
const LAYER_1_SIZE = 100;
const BAG_OF_WORDS_WINDOW = 5;

var filePath = path.join(__dirname, 'corpus.txt');
var corpus = "";
var context = 2;  //context is the number of words +- a word that we will look at
var wordMap = {};	//maps a word to its frequency

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
	splitWords.forEach(function(word) {
		if (!wordMap[word]) wordMap[word] = 0;
		wordMap[word] ++;
	});
	var wordArray = _.chain(wordMap).map(function(wordCount, word) {
		return {
			word: word,
			weight: wordCount
		};
	}).sortBy(['weight']).value();

	trainModel(splitWords);
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
