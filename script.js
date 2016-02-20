//steps:
// 1.  read file and break into map of map[word] = frequencyOfWord
// 2.  Create binary Huffman tree using the word counts.  Frequent words will have short uniqe binary codes
// 3.  Read over the trainModelThread code in word2vec

var fs = require('fs');
var path = require('path');

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
	console.log(wordMap)
};


