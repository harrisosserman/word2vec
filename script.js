var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'corpus.txt');
var corpus = "";

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
	var wordFrequency = {};
	splitWords.forEach(function(word) {
		if (!wordFrequency[word]) wordFrequency[word] = 0;
		wordFrequency[word] += 1;
	});

	console.log(wordFrequency)
};


