var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'corpus.txt');
var corpus = "";
var context = 2;  //context is the number of words +- a word that we will look at
var wordMap = {};	//maps a word to all of its context words, inclduing frequency of context word

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
	// to avoid having this run n^2 time, store temporary variables
	var prev2 = null, prev1 = null, current = null, next1 = null, next2 = null;
	splitWords.forEach(function(word) {
		next2 = word;
		if (current !== null) {
			if (!wordMap[current])	wordMap[current] = {};
			if (!wordMap[current][prev2])  wordMap[current][prev2] = 0;
			if (!wordMap[current][prev1])  wordMap[current][prev1] = 0;
			if (!wordMap[current][next1])  wordMap[current][next1] = 0;
			if (!wordMap[current][next2])  wordMap[current][next2] = 0;
			wordMap[current][prev2] += 1;
			wordMap[current][prev1] += 1;
			wordMap[current][next1] += 1;
			wordMap[current][next2] += 1;		
		}
		prev2 = prev1;
		prev1 = current;
		current = next1;
		next1 = next2;
	});
	console.log(wordMap)
};


