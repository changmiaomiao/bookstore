var http=require("http");
var fs=require("fs");
var url=require("url");
var mime=require("mime");
http.createServer(function(req,res){
    var obj=url.parse(req.url,true);
    var pathname=obj.pathname;
    if(pathname=="/"){
        res.setHeader("Content-Type","text/html;charset=utf8");
        fs.createReadStream("./index.html").pipe(res);
    }
    else if(/^\/books(\/\d+)?$/.test(pathname)){
        //restful 风格  根据method和传入的方法的值来判断是增删改查的哪一种
        var matcher=pathname.match(/^\/books(\/\d+)?$/)[1];
        //[ '/books', undefined, index: 0, input: '/books' ]  [1]
        //如果matcher存在,说明传递了参数
        switch (req.method){
            case "GET":
                if(matcher){//获取一个
                    //获取传入的id
                    var id=matcher.slice(1);
                    getBooks(function(data){
                        //去所有书中找到id匹配的那一本书
                        var book=data.find(function(item){
                            return item.id==id;//如果为true返回那一项
                        });
                        res.end(JSON.stringify(book));
                    });
                }else{
                    getBooks(function(data){//获取所有
                        res.setHeader("Content-Type","application/json;charset=utf8");
                        res.end(JSON.stringify(data));
                    });
                }
                break;
            case "POST":
                //获取传过来的请求体  req的可读流
                var result="";
                req.on("data",function(data){
                    result+=data;
                });
                req.on("end",function(){
                    var book=JSON.parse(result);//获取数据后,写入到JSON文件中
                    getBooks(function(data){
                        book.id=!data.length?1:data[data.length-1].id+1;
                        //book.id=data.length+1;//加一个id属性作为唯一的标识
                        data.push(book);
                        setBooks(data,function(){
                            //增加方法,需要返回增加的那一项,返回保存的那个值
                            res.end(JSON.stringify(book));//必须结束掉
                        })
                    })
                });

                break;
            case "PUT":
                //在url中获取id
                //在请求体中获取数据
                if(matcher){
                    var bookId=matcher.slice(1);//需要更改图书的id号
                    var result="";//
                    req.on("data",function(data){
                        result+=data;
                    });
                    req.on("end",function(){
                        var book=JSON.parse(result).book;//数据
                       getBooks(function(data){
                           data=data.map(function(item){
                               if(item.id==bookId){
                                   return book;//替换掉
                               }
                               return item;
                           });
                           setBooks(data,function(){
                               res.end(JSON.stringify(book));
                           });
                       }) ;
                    });
                }
                break;
            case "DELETE":
                //要获取传入的id
                if(matcher){
                    var bookId=matcher.slice(1);
                    getBooks(function(data){
                        data=data.filter(function(item){
                            return item.id!=bookId;
                        });
                        setBooks(data,function(){
                            res.end(JSON.stringify({}));
                        })
                    })
                }else{

                }
                break;

        }
    }
    else{
        fs.exists("."+pathname,function(exists){
            if(exists){
                res.setHeader("Content-Type",mime.lookup(pathname)+";charset=utf8");
                fs.createReadStream("."+pathname).pipe(res);
            }else {
                res.statusCode=404;
                res.end();
            }
        })
    }
}).listen(3000,function(){
    console.log("3000成功");
});

function getBooks(callback){
    fs.readFile("./book.json","utf-8",function(err,data){
        var books=[];
        if(err){
            callback(books);
        }else{
            if(data.startsWith("[")){
                books=JSON.parse(data);
            }
            callback(books);
        }

    });

};
//从book.json中读取
function setBooks(data,callback){
    fs.writeFile("./book.json",JSON.stringify(data),callback);
};
//将内容写到book.json中