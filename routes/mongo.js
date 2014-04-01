var mongo = require('mongoose').connect('mongodb://rajatgupta431:1271994127@widmore.mongohq.com:10010/fbapp') ;
var Schema = mongo.Schema;
var userSchema = new Schema({
	token: String,
	name: String,
	email : String,
	id: String,
	date :{type: Date,default : Date.now}
});
var pageSchema = new Schema({
	name: String,
	id:String,
	page_name: String,
	title: String,
	url: String,
	date :{type: Date,default : Date.now}
});

module.exports ={
	
	user : mongo.model('user',userSchema),
	page : mongo.model('page',pageSchema)
	
	
	}

 
