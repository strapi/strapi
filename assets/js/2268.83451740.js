"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([["2268"],{82735(t,e,s){s.d(e,{CP:()=>d,Ck:()=>y,HT:()=>p,PB:()=>u,aC:()=>h,lC:()=>l,m:()=>c,tk:()=>o});var i=s(81177),r=s(86827),a=s(16750),n=s(30169),o=(0,r.K)((t,e)=>{let s=t.append("rect");if(s.attr("x",e.x),s.attr("y",e.y),s.attr("fill",e.fill),s.attr("stroke",e.stroke),s.attr("width",e.width),s.attr("height",e.height),e.name&&s.attr("name",e.name),e.rx&&s.attr("rx",e.rx),e.ry&&s.attr("ry",e.ry),void 0!==e.attrs)for(let t in e.attrs)s.attr(t,e.attrs[t]);return e.class&&s.attr("class",e.class),s},"drawRect"),l=(0,r.K)((t,e)=>{o(t,{x:e.startx,y:e.starty,width:e.stopx-e.startx,height:e.stopy-e.starty,fill:e.fill,stroke:e.stroke,class:"rect"}).lower()},"drawBackgroundRect"),c=(0,r.K)((t,e)=>{let s=e.text.replace(i.H1," "),r=t.append("text");r.attr("x",e.x),r.attr("y",e.y),r.attr("class","legend"),r.style("text-anchor",e.anchor),e.class&&r.attr("class",e.class);let a=r.append("tspan");return a.attr("x",e.x+2*e.textMargin),a.text(s),r},"drawText"),h=(0,r.K)((t,e,s,i)=>{let r=t.append("image");r.attr("x",e),r.attr("y",s);let n=(0,a.sanitizeUrl)(i);r.attr("xlink:href",n)},"drawImage"),d=(0,r.K)((t,e,s,i)=>{let r=t.append("use");r.attr("x",e),r.attr("y",s);let n=(0,a.sanitizeUrl)(i);r.attr("xlink:href",`#${n}`)},"drawEmbeddedImage"),u=(0,r.K)(()=>({x:0,y:0,width:100,height:100,fill:"#EDF2AE",stroke:"#666",anchor:"start",rx:0,ry:0}),"getNoteRect"),p=(0,r.K)(()=>({x:0,y:0,width:100,height:100,"text-anchor":"start",style:"#666",textMargin:0,rx:0,ry:0,tspan:!0}),"getTextObj"),y=(0,r.K)(()=>{let t=(0,n.Ltv)(".mermaidTooltip");return t.empty()&&(t=(0,n.Ltv)("body").append("div").attr("class","mermaidTooltip").style("opacity",0).style("position","absolute").style("text-align","center").style("max-width","200px").style("padding","2px").style("font-size","12px").style("background","#ffffde").style("border","1px solid #333").style("border-radius","2px").style("pointer-events","none").style("z-index","100")),t},"createTooltip")},35869(t,e,s){s.d(e,{P:()=>n});var i=s(81177),r=s(31293),a=s(86827),n=(0,a.K)((t,e,s,a)=>{t.attr("class",s);let{width:n,height:c,x:h,y:d}=o(t,e);(0,i.a$)(t,c,n,a);let u=l(h,d,n,c,e);t.attr("viewBox",u),r.R.debug(`viewBox configured: ${u} with padding: ${e}`)},"setupViewPortForSVG"),o=(0,a.K)((t,e)=>{let s=t.node()?.getBBox()||{width:0,height:0,x:0,y:0};return{width:s.width+2*e,height:s.height+2*e,x:s.x,y:s.y}},"calculateDimensionsWithPadding"),l=(0,a.K)((t,e,s,i,r)=>`${t-r} ${e-r} ${s} ${i}`,"createViewBox")},96755(t,e,s){s.d(e,{A:()=>a});var i=s(86827),r=s(30169),a=(0,i.K)((t,e)=>{let s;return"sandbox"===e&&(s=(0,r.Ltv)("#i"+t)),("sandbox"===e?(0,r.Ltv)(s.nodes()[0].contentDocument.body):(0,r.Ltv)("body")).select(`[id="${t}"]`)},"getDiagramElement")},87335(t,e,s){s.d(e,{diagram:()=>td});var i=s(96755),r=s(35869),a=s(72391);s(43247);var n=s(82735);s(5616),s(16163),s(97827),s(43002),s(60739),s(36320),s(62217);var o=s(92941),l=s(86348),c=s(81177),h=s(31293),d=s(86827),u=s(30169),p=s(99418),y=function(){var t=(0,d.K)(function(t,e,s,i){for(s=s||{},i=t.length;i--;s[t[i]]=e);return s},"o"),e=[1,2],s=[1,3],i=[1,4],r=[2,4],a=[1,9],n=[1,11],o=[1,16],l=[1,17],c=[1,18],h=[1,19],u=[1,33],p=[1,20],y=[1,21],g=[1,22],f=[1,23],m=[1,24],S=[1,26],k=[1,27],b=[1,28],T=[1,29],_=[1,30],x=[1,31],E=[1,32],$=[1,35],D=[1,36],C=[1,37],v=[1,38],w=[1,34],I=[1,4,5,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,41,45,48,51,52,53,54,57],A=[1,4,5,14,15,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,39,40,41,45,48,51,52,53,54,57],L=[4,5,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,41,45,48,51,52,53,54,57],R={trace:(0,d.K)(function(){},"trace"),yy:{},symbols_:{error:2,start:3,SPACE:4,NL:5,SD:6,document:7,line:8,statement:9,classDefStatement:10,styleStatement:11,cssClassStatement:12,idStatement:13,DESCR:14,"--\x3e":15,HIDE_EMPTY:16,scale:17,WIDTH:18,COMPOSIT_STATE:19,STRUCT_START:20,STRUCT_STOP:21,STATE_DESCR:22,AS:23,ID:24,FORK:25,JOIN:26,CHOICE:27,CONCURRENT:28,note:29,notePosition:30,NOTE_TEXT:31,direction:32,acc_title:33,acc_title_value:34,acc_descr:35,acc_descr_value:36,acc_descr_multiline_value:37,CLICK:38,STRING:39,HREF:40,classDef:41,CLASSDEF_ID:42,CLASSDEF_STYLEOPTS:43,DEFAULT:44,style:45,STYLE_IDS:46,STYLEDEF_STYLEOPTS:47,class:48,CLASSENTITY_IDS:49,STYLECLASS:50,direction_tb:51,direction_bt:52,direction_rl:53,direction_lr:54,eol:55,";":56,EDGE_STATE:57,STYLE_SEPARATOR:58,left_of:59,right_of:60,$accept:0,$end:1},terminals_:{2:"error",4:"SPACE",5:"NL",6:"SD",14:"DESCR",15:"--\x3e",16:"HIDE_EMPTY",17:"scale",18:"WIDTH",19:"COMPOSIT_STATE",20:"STRUCT_START",21:"STRUCT_STOP",22:"STATE_DESCR",23:"AS",24:"ID",25:"FORK",26:"JOIN",27:"CHOICE",28:"CONCURRENT",29:"note",31:"NOTE_TEXT",33:"acc_title",34:"acc_title_value",35:"acc_descr",36:"acc_descr_value",37:"acc_descr_multiline_value",38:"CLICK",39:"STRING",40:"HREF",41:"classDef",42:"CLASSDEF_ID",43:"CLASSDEF_STYLEOPTS",44:"DEFAULT",45:"style",46:"STYLE_IDS",47:"STYLEDEF_STYLEOPTS",48:"class",49:"CLASSENTITY_IDS",50:"STYLECLASS",51:"direction_tb",52:"direction_bt",53:"direction_rl",54:"direction_lr",56:";",57:"EDGE_STATE",58:"STYLE_SEPARATOR",59:"left_of",60:"right_of"},productions_:[0,[3,2],[3,2],[3,2],[7,0],[7,2],[8,2],[8,1],[8,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,3],[9,4],[9,1],[9,2],[9,1],[9,4],[9,3],[9,6],[9,1],[9,1],[9,1],[9,1],[9,4],[9,4],[9,1],[9,2],[9,2],[9,1],[9,5],[9,5],[10,3],[10,3],[11,3],[12,3],[32,1],[32,1],[32,1],[32,1],[55,1],[55,1],[13,1],[13,1],[13,3],[13,3],[30,1],[30,1]],performAction:(0,d.K)(function(t,e,s,i,r,a,n){var o=a.length-1;switch(r){case 3:return i.setRootDoc(a[o]),a[o];case 4:this.$=[];break;case 5:"nl"!=a[o]&&(a[o-1].push(a[o]),this.$=a[o-1]);break;case 6:case 7:case 12:this.$=a[o];break;case 8:this.$="nl";break;case 13:let l=a[o-1];l.description=i.trimColon(a[o]),this.$=l;break;case 14:this.$={stmt:"relation",state1:a[o-2],state2:a[o]};break;case 15:let c=i.trimColon(a[o]);this.$={stmt:"relation",state1:a[o-3],state2:a[o-1],description:c};break;case 19:this.$={stmt:"state",id:a[o-3],type:"default",description:"",doc:a[o-1]};break;case 20:var h=a[o],d=a[o-2].trim();if(a[o].match(":")){var u=a[o].split(":");h=u[0],d=[d,u[1]]}this.$={stmt:"state",id:h,type:"default",description:d};break;case 21:this.$={stmt:"state",id:a[o-3],type:"default",description:a[o-5],doc:a[o-1]};break;case 22:this.$={stmt:"state",id:a[o],type:"fork"};break;case 23:this.$={stmt:"state",id:a[o],type:"join"};break;case 24:this.$={stmt:"state",id:a[o],type:"choice"};break;case 25:this.$={stmt:"state",id:i.getDividerId(),type:"divider"};break;case 26:this.$={stmt:"state",id:a[o-1].trim(),note:{position:a[o-2].trim(),text:a[o].trim()}};break;case 29:this.$=a[o].trim(),i.setAccTitle(this.$);break;case 30:case 31:this.$=a[o].trim(),i.setAccDescription(this.$);break;case 32:this.$={stmt:"click",id:a[o-3],url:a[o-2],tooltip:a[o-1]};break;case 33:this.$={stmt:"click",id:a[o-3],url:a[o-1],tooltip:""};break;case 34:case 35:this.$={stmt:"classDef",id:a[o-1].trim(),classes:a[o].trim()};break;case 36:this.$={stmt:"style",id:a[o-1].trim(),styleClass:a[o].trim()};break;case 37:this.$={stmt:"applyClass",id:a[o-1].trim(),styleClass:a[o].trim()};break;case 38:i.setDirection("TB"),this.$={stmt:"dir",value:"TB"};break;case 39:i.setDirection("BT"),this.$={stmt:"dir",value:"BT"};break;case 40:i.setDirection("RL"),this.$={stmt:"dir",value:"RL"};break;case 41:i.setDirection("LR"),this.$={stmt:"dir",value:"LR"};break;case 44:case 45:this.$={stmt:"state",id:a[o].trim(),type:"default",description:""};break;case 46:case 47:this.$={stmt:"state",id:a[o-2].trim(),classes:[a[o].trim()],type:"default",description:""}}},"anonymous"),table:[{3:1,4:e,5:s,6:i},{1:[3]},{3:5,4:e,5:s,6:i},{3:6,4:e,5:s,6:i},t([1,4,5,16,17,19,22,24,25,26,27,28,29,33,35,37,38,41,45,48,51,52,53,54,57],r,{7:7}),{1:[2,1]},{1:[2,2]},{1:[2,3],4:a,5:n,8:8,9:10,10:12,11:13,12:14,13:15,16:o,17:l,19:c,22:h,24:u,25:p,26:y,27:g,28:f,29:m,32:25,33:S,35:k,37:b,38:T,41:_,45:x,48:E,51:$,52:D,53:C,54:v,57:w},t(I,[2,5]),{9:39,10:12,11:13,12:14,13:15,16:o,17:l,19:c,22:h,24:u,25:p,26:y,27:g,28:f,29:m,32:25,33:S,35:k,37:b,38:T,41:_,45:x,48:E,51:$,52:D,53:C,54:v,57:w},t(I,[2,7]),t(I,[2,8]),t(I,[2,9]),t(I,[2,10]),t(I,[2,11]),t(I,[2,12],{14:[1,40],15:[1,41]}),t(I,[2,16]),{18:[1,42]},t(I,[2,18],{20:[1,43]}),{23:[1,44]},t(I,[2,22]),t(I,[2,23]),t(I,[2,24]),t(I,[2,25]),{30:45,31:[1,46],59:[1,47],60:[1,48]},t(I,[2,28]),{34:[1,49]},{36:[1,50]},t(I,[2,31]),{13:51,24:u,57:w},{42:[1,52],44:[1,53]},{46:[1,54]},{49:[1,55]},t(A,[2,44],{58:[1,56]}),t(A,[2,45],{58:[1,57]}),t(I,[2,38]),t(I,[2,39]),t(I,[2,40]),t(I,[2,41]),t(I,[2,6]),t(I,[2,13]),{13:58,24:u,57:w},t(I,[2,17]),t(L,r,{7:59}),{24:[1,60]},{24:[1,61]},{23:[1,62]},{24:[2,48]},{24:[2,49]},t(I,[2,29]),t(I,[2,30]),{39:[1,63],40:[1,64]},{43:[1,65]},{43:[1,66]},{47:[1,67]},{50:[1,68]},{24:[1,69]},{24:[1,70]},t(I,[2,14],{14:[1,71]}),{4:a,5:n,8:8,9:10,10:12,11:13,12:14,13:15,16:o,17:l,19:c,21:[1,72],22:h,24:u,25:p,26:y,27:g,28:f,29:m,32:25,33:S,35:k,37:b,38:T,41:_,45:x,48:E,51:$,52:D,53:C,54:v,57:w},t(I,[2,20],{20:[1,73]}),{31:[1,74]},{24:[1,75]},{39:[1,76]},{39:[1,77]},t(I,[2,34]),t(I,[2,35]),t(I,[2,36]),t(I,[2,37]),t(A,[2,46]),t(A,[2,47]),t(I,[2,15]),t(I,[2,19]),t(L,r,{7:78}),t(I,[2,26]),t(I,[2,27]),{5:[1,79]},{5:[1,80]},{4:a,5:n,8:8,9:10,10:12,11:13,12:14,13:15,16:o,17:l,19:c,21:[1,81],22:h,24:u,25:p,26:y,27:g,28:f,29:m,32:25,33:S,35:k,37:b,38:T,41:_,45:x,48:E,51:$,52:D,53:C,54:v,57:w},t(I,[2,32]),t(I,[2,33]),t(I,[2,21])],defaultActions:{5:[2,1],6:[2,2],47:[2,48],48:[2,49]},parseError:(0,d.K)(function(t,e){if(e.recoverable)this.trace(t);else{var s=Error(t);throw s.hash=e,s}},"parseError"),parse:(0,d.K)(function(t){var e=this,s=[0],i=[],r=[null],a=[],n=this.table,o="",l=0,c=0,h=0,u=a.slice.call(arguments,1),p=Object.create(this.lexer),y={};for(var g in this.yy)Object.prototype.hasOwnProperty.call(this.yy,g)&&(y[g]=this.yy[g]);p.setInput(t,y),y.lexer=p,y.parser=this,void 0===p.yylloc&&(p.yylloc={});var f=p.yylloc;a.push(f);var m=p.options&&p.options.ranges;function S(){var t;return"number"!=typeof(t=i.pop()||p.lex()||1)&&(t instanceof Array&&(t=(i=t).pop()),t=e.symbols_[t]||t),t}"function"==typeof y.parseError?this.parseError=y.parseError:this.parseError=Object.getPrototypeOf(this).parseError,(0,d.K)(function(t){s.length=s.length-2*t,r.length=r.length-t,a.length=a.length-t},"popStack"),(0,d.K)(S,"lex");for(var k,b,T,_,x,E,$,D,C,v={};;){if(T=s[s.length-1],this.defaultActions[T]?_=this.defaultActions[T]:(null==k&&(k=S()),_=n[T]&&n[T][k]),void 0===_||!_.length||!_[0]){var w="";for(E in C=[],n[T])this.terminals_[E]&&E>2&&C.push("'"+this.terminals_[E]+"'");w=p.showPosition?"Parse error on line "+(l+1)+":\n"+p.showPosition()+"\nExpecting "+C.join(", ")+", got '"+(this.terminals_[k]||k)+"'":"Parse error on line "+(l+1)+": Unexpected "+(1==k?"end of input":"'"+(this.terminals_[k]||k)+"'"),this.parseError(w,{text:p.match,token:this.terminals_[k]||k,line:p.yylineno,loc:f,expected:C})}if(_[0]instanceof Array&&_.length>1)throw Error("Parse Error: multiple actions possible at state: "+T+", token: "+k);switch(_[0]){case 1:s.push(k),r.push(p.yytext),a.push(p.yylloc),s.push(_[1]),k=null,b?(k=b,b=null):(c=p.yyleng,o=p.yytext,l=p.yylineno,f=p.yylloc,h>0&&h--);break;case 2:if($=this.productions_[_[1]][1],v.$=r[r.length-$],v._$={first_line:a[a.length-($||1)].first_line,last_line:a[a.length-1].last_line,first_column:a[a.length-($||1)].first_column,last_column:a[a.length-1].last_column},m&&(v._$.range=[a[a.length-($||1)].range[0],a[a.length-1].range[1]]),void 0!==(x=this.performAction.apply(v,[o,c,l,y,_[1],r,a].concat(u))))return x;$&&(s=s.slice(0,-1*$*2),r=r.slice(0,-1*$),a=a.slice(0,-1*$)),s.push(this.productions_[_[1]][0]),r.push(v.$),a.push(v._$),D=n[s[s.length-2]][s[s.length-1]],s.push(D);break;case 3:return!0}}return!0},"parse")};function N(){this.yy={}}return R.lexer={EOF:1,parseError:(0,d.K)(function(t,e){if(this.yy.parser)this.yy.parser.parseError(t,e);else throw Error(t)},"parseError"),setInput:(0,d.K)(function(t,e){return this.yy=e||this.yy||{},this._input=t,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:(0,d.K)(function(){var t=this._input[0];return this.yytext+=t,this.yyleng++,this.offset++,this.match+=t,this.matched+=t,t.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),t},"input"),unput:(0,d.K)(function(t){var e=t.length,s=t.split(/(?:\r\n?|\n)/g);this._input=t+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-e),this.offset-=e;var i=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),s.length-1&&(this.yylineno-=s.length-1);var r=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:s?(s.length===i.length?this.yylloc.first_column:0)+i[i.length-s.length].length-s[0].length:this.yylloc.first_column-e},this.options.ranges&&(this.yylloc.range=[r[0],r[0]+this.yyleng-e]),this.yyleng=this.yytext.length,this},"unput"),more:(0,d.K)(function(){return this._more=!0,this},"more"),reject:(0,d.K)(function(){return this.options.backtrack_lexer?(this._backtrack=!0,this):this.parseError("Lexical error on line "+(this.yylineno+1)+". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},"reject"),less:(0,d.K)(function(t){this.unput(this.match.slice(t))},"less"),pastInput:(0,d.K)(function(){var t=this.matched.substr(0,this.matched.length-this.match.length);return(t.length>20?"...":"")+t.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:(0,d.K)(function(){var t=this.match;return t.length<20&&(t+=this._input.substr(0,20-t.length)),(t.substr(0,20)+(t.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:(0,d.K)(function(){var t=this.pastInput(),e=Array(t.length+1).join("-");return t+this.upcomingInput()+"\n"+e+"^"},"showPosition"),test_match:(0,d.K)(function(t,e){var s,i,r;if(this.options.backtrack_lexer&&(r={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(r.yylloc.range=this.yylloc.range.slice(0))),(i=t[0].match(/(?:\r\n?|\n).*/g))&&(this.yylineno+=i.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:i?i[i.length-1].length-i[i.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+t[0].length},this.yytext+=t[0],this.match+=t[0],this.matches=t,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(t[0].length),this.matched+=t[0],s=this.performAction.call(this,this.yy,this,e,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),s)return s;if(this._backtrack)for(var a in r)this[a]=r[a];return!1},"test_match"),next:(0,d.K)(function(){if(this.done)return this.EOF;this._input||(this.done=!0),this._more||(this.yytext="",this.match="");for(var t,e,s,i,r=this._currentRules(),a=0;a<r.length;a++)if((s=this._input.match(this.rules[r[a]]))&&(!e||s[0].length>e[0].length)){if(e=s,i=a,this.options.backtrack_lexer){if(!1!==(t=this.test_match(s,r[a])))return t;if(!this._backtrack)return!1;e=!1;continue}if(!this.options.flex)break}return e?!1!==(t=this.test_match(e,r[i]))&&t:""===this._input?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+". Unrecognized text.\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:(0,d.K)(function(){var t=this.next();return t||this.lex()},"lex"),begin:(0,d.K)(function(t){this.conditionStack.push(t)},"begin"),popState:(0,d.K)(function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:(0,d.K)(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:(0,d.K)(function(t){return(t=this.conditionStack.length-1-Math.abs(t||0))>=0?this.conditionStack[t]:"INITIAL"},"topState"),pushState:(0,d.K)(function(t){this.begin(t)},"pushState"),stateStackSize:(0,d.K)(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":!0},performAction:(0,d.K)(function(t,e,s,i){function r(){let s=e.yytext.indexOf("%%");if(0===s)return!1;if(s>0){let i=e.yytext.slice(0,s),r=e.yytext.slice(s);r&&t.lexer.unput(r),e.yytext=i}return!0}switch((0,d.K)(r,"processId"),s){case 0:return 38;case 1:return 40;case 2:return 39;case 3:return 44;case 4:case 43:return 51;case 5:case 44:return 52;case 6:case 45:return 53;case 7:case 46:return 54;case 8:case 78:return 5;case 9:case 10:case 11:case 12:case 57:case 63:break;case 13:case 33:return this.pushState("SCALE"),17;case 14:case 34:return 18;case 15:case 21:case 35:case 50:case 54:this.popState();break;case 16:return this.begin("acc_title"),33;case 17:return this.popState(),"acc_title_value";case 18:return this.begin("acc_descr"),35;case 19:return this.popState(),"acc_descr_value";case 20:this.begin("acc_descr_multiline");break;case 22:return"acc_descr_multiline_value";case 23:return this.pushState("CLASSDEF"),41;case 24:return this.popState(),this.pushState("CLASSDEFID"),"DEFAULT_CLASSDEF_ID";case 25:return this.popState(),this.pushState("CLASSDEFID"),42;case 26:return this.popState(),43;case 27:return this.pushState("CLASS"),48;case 28:return this.popState(),this.pushState("CLASS_STYLE"),49;case 29:return this.popState(),50;case 30:return this.pushState("STYLE"),45;case 31:return this.popState(),this.pushState("STYLEDEF_STYLES"),46;case 32:return this.popState(),47;case 36:this.pushState("STATE");break;case 37:case 40:return this.popState(),e.yytext=e.yytext.slice(0,-8).trim(),25;case 38:case 41:return this.popState(),e.yytext=e.yytext.slice(0,-8).trim(),26;case 39:case 42:return this.popState(),e.yytext=e.yytext.slice(0,-10).trim(),27;case 47:this.pushState("STATE_STRING");break;case 48:return this.pushState("STATE_ID"),"AS";case 49:case 65:if(!r())return;return this.popState(),"ID";case 51:return"STATE_DESCR";case 52:throw Error('Error: State name must be a single word. Found: "'+e.yytext.trim()+'"');case 53:return 19;case 55:return this.popState(),this.pushState("struct"),20;case 56:return this.popState(),21;case 58:return this.begin("NOTE"),29;case 59:return this.popState(),this.pushState("NOTE_ID"),59;case 60:return this.popState(),this.pushState("NOTE_ID"),60;case 61:this.popState(),this.pushState("FLOATING_NOTE");break;case 62:return this.popState(),this.pushState("FLOATING_NOTE_ID"),"AS";case 64:return"NOTE_TEXT";case 66:if(!r())return;return this.popState(),this.pushState("NOTE_TEXT"),24;case 67:return this.popState(),e.yytext=e.yytext.substr(2).trim(),31;case 68:return this.popState(),e.yytext=e.yytext.slice(0,-8).trim(),31;case 69:case 70:return 6;case 71:return 16;case 72:return 57;case 73:if(!r())return;return 24;case 74:return e.yytext=e.yytext.trim(),14;case 75:return 15;case 76:return 28;case 77:return 58;case 79:return"INVALID"}},"anonymous"),rules:[/^(?:click\b)/i,/^(?:href\b)/i,/^(?:"[^"]*")/i,/^(?:default\b)/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:[\n]+)/i,/^(?:[\s]+)/i,/^(?:((?!\n)\s)+)/i,/^(?:#[^\n]*)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:classDef\s+)/i,/^(?:DEFAULT\s+)/i,/^(?:\w+\s+)/i,/^(?:[^\n]*)/i,/^(?:class\s+)/i,/^(?:(\w+)+((,\s*\w+)*))/i,/^(?:[^\n]*)/i,/^(?:style\s+)/i,/^(?:[\w,]+\s+)/i,/^(?:[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:state\s+)/i,/^(?:.*<<fork>>)/i,/^(?:.*<<join>>)/i,/^(?:.*<<choice>>)/i,/^(?:.*\[\[fork\]\])/i,/^(?:.*\[\[join\]\])/i,/^(?:.*\[\[choice\]\])/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:["])/i,/^(?:\s*as\s+)/i,/^(?:[^\n\{]*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:\w+\s+\w+.*?\{)/i,/^(?:[^\n\s\{]+)/i,/^(?:\n)/i,/^(?:\{)/i,/^(?:\})/i,/^(?:[\n])/i,/^(?:note\s+)/i,/^(?:left of\b)/i,/^(?:right of\b)/i,/^(?:")/i,/^(?:\s*as\s*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n]*)/i,/^(?:\s*[^:\n\s\-]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:[\s\S]*?\n\s*end note\b)/i,/^(?:stateDiagram\s+)/i,/^(?:stateDiagram-v2\s+)/i,/^(?:hide empty description\b)/i,/^(?:\[\*\])/i,/^(?:[^:\n\s\-\{]+)/i,/^(?:\s*:(?:[^:\n;]|:[^:\n;])+)/i,/^(?:-->)/i,/^(?:--)/i,/^(?::::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{LINE:{rules:[10,11,12],inclusive:!1},struct:{rules:[10,11,12,23,27,30,36,43,44,45,46,56,57,58,72,73,74,75,76,77],inclusive:!1},FLOATING_NOTE_ID:{rules:[65],inclusive:!1},FLOATING_NOTE:{rules:[62,63,64],inclusive:!1},NOTE_TEXT:{rules:[67,68],inclusive:!1},NOTE_ID:{rules:[66],inclusive:!1},NOTE:{rules:[59,60,61],inclusive:!1},STYLEDEF_STYLEOPTS:{rules:[],inclusive:!1},STYLEDEF_STYLES:{rules:[32],inclusive:!1},STYLE_IDS:{rules:[],inclusive:!1},STYLE:{rules:[31],inclusive:!1},CLASS_STYLE:{rules:[29],inclusive:!1},CLASS:{rules:[28],inclusive:!1},CLASSDEFID:{rules:[26],inclusive:!1},CLASSDEF:{rules:[24,25],inclusive:!1},acc_descr_multiline:{rules:[21,22],inclusive:!1},acc_descr:{rules:[19],inclusive:!1},acc_title:{rules:[17],inclusive:!1},SCALE:{rules:[14,15,34,35],inclusive:!1},ALIAS:{rules:[],inclusive:!1},STATE_ID:{rules:[49],inclusive:!1},STATE_STRING:{rules:[50,51],inclusive:!1},FORK_STATE:{rules:[],inclusive:!1},STATE:{rules:[10,11,12,37,38,39,40,41,42,47,48,52,53,54,55],inclusive:!1},ID:{rules:[10,11,12],inclusive:!1},INITIAL:{rules:[0,1,2,3,4,5,6,7,8,9,11,12,13,16,18,20,23,27,30,33,36,55,58,69,70,71,72,73,74,75,77,78,79],inclusive:!0}}},(0,d.K)(N,"Parser"),N.prototype=R,R.Parser=N,new N}();y.parser=y;var g="TB",f="state",m="root",S="relation",k="default",b="divider",T="fill:none",_="fill: #333",x="markdown",E="normal",$="rect",D="rectWithTitle",C="divider",v="roundedWithTitle",w="statediagram",I=`${w}-state`,A="transition",L=`${A} note-edge`,R=`${w}-note`,N=`${w}-cluster`,K=`${w}-cluster-alt`,O="parent",B="note",F="----",P=`${F}${B}`,Y=`${F}${O}`,G=new Map,j=0,W=0,z=new Map,M=(0,d.K)((t,e,s,i)=>{if(t===C&&s?.id!==void 0&&z.has(s.id)){let t=z.get(s.id);return z.set(e,t),t}let r=W++,a=i?void 0:r;return z.set(e,a),a},"colorSlotFor");function U(t="",e=0,s="",i=F){let r=null!==s&&s.length>0?`${i}${s}`:"";return`state-${t}${r}-${e}`}(0,d.K)(U,"stateDomId");var H=(0,d.K)((t,e,s,i,r,a,n,o)=>{h.R.trace("items",e),e.forEach(e=>{switch(e.stmt){case f:case k:Q(t,e,s,i,r,a,n,o);break;case S:{Q(t,e.state1,s,i,r,a,n,o),Q(t,e.state2,s,i,r,a,n,o);let l="neo"===n,h={id:"edge"+j,start:e.state1.id,end:e.state2.id,arrowhead:"normal",arrowTypeEnd:l?"arrow_barb_neo":"arrow_barb",style:T,labelStyle:"",label:c.Y2.sanitizeText(e.description??"",(0,c.D7)()),arrowheadStyle:_,labelpos:"c",labelType:x,thickness:E,classes:A,look:n};r.push(h),j++}}})},"setupDoc"),X=(0,d.K)((t,e=g)=>{let s=e;if(t.doc)for(let e of t.doc)"dir"===e.stmt&&(s=e.value);return s},"getDir");function V(t,e,s){if(!e.id||"</join></fork>"===e.id||"</choice>"===e.id)return;e.cssClasses&&(Array.isArray(e.cssCompiledStyles)||(e.cssCompiledStyles=[]),e.cssClasses.split(" ").forEach(t=>{let i=s.get(t);i&&(e.cssCompiledStyles=[...e.cssCompiledStyles??[],...i.styles])}));let i=t.find(t=>t.id===e.id);i?Object.assign(i,e):t.push(e)}function J(t){return t?.classes?.join(" ")??""}function q(t){return t?.styles??[]}(0,d.K)(V,"insertOrUpdateNode"),(0,d.K)(J,"getClassesFromDbInfo"),(0,d.K)(q,"getStylesFromDbInfo");var Q=(0,d.K)((t,e,s,i,r,a,n,o)=>{let l=e.id,d=s.get(l),u=J(d),p=q(d),y=(0,c.D7)(),g=""!==u.trim()||p.length>0;if(h.R.info("dataFetcher parsedItem",e,d,p),"root"!==l){let s=$;!0===e.start?s="stateStart":!1===e.start&&(s="stateEnd"),e.type!==k&&(s=e.type),G.get(l)||G.set(l,{id:l,shape:s,description:c.Y2.sanitizeText(l,y),cssClasses:`${u} ${I}`,cssStyles:p});let d=G.get(l);e.description&&(Array.isArray(d.description)?(d.shape=D,d.description.push(e.description)):d.description?.length&&d.description.length>0?(d.shape=D,d.description===l?d.description=[e.description]:d.description=[d.description,e.description]):(d.shape=$,d.description=e.description),d.description=c.Y2.sanitizeTextOrArray(d.description,y)),d.description?.length===1&&d.shape===D&&("group"===d.type?d.shape=v:d.shape=$),!d.type&&e.doc&&(h.R.info("Setting cluster for XCX",l,X(e)),d.type="group",d.isGroup=!0,d.dir=X(e),d.shape=e.type===b?C:v,d.colorIndex=M(d.shape,l,t,g),d.cssClasses=`${d.cssClasses} ${N} ${a?K:""}`);let f={labelStyle:"",shape:d.shape,label:d.description,cssClasses:d.cssClasses,cssCompiledStyles:[],cssStyles:d.cssStyles,id:l,dir:d.dir,domId:U(l,j),type:d.type,isGroup:"group"===d.type,colorIndex:d.colorIndex,padding:8,rx:10,ry:10,look:n,labelType:"markdown"};if(f.shape===C&&(f.label=""),t&&"root"!==t.id&&(h.R.trace("Setting node ",l," to be child of its parent ",t.id),f.parentId=t.id),f.centerLabel=!0,e.note){let t={labelStyle:"",shape:"note",label:e.note.text,labelType:"markdown",cssClasses:R,cssStyles:[],cssCompiledStyles:[],id:l+P+"-"+j,domId:U(l,j,B),type:"node",isGroup:!1,padding:y.flowchart?.padding,look:n,position:e.note.position},s=l+Y,a={labelStyle:"",shape:"noteGroup",label:e.note.text,cssClasses:d.cssClasses,cssStyles:[],id:l+Y,domId:U(l,j,O),type:"group",isGroup:!0,padding:16,look:n,position:e.note.position};j++,a.id=s,t.parentId=s,V(i,a,o),V(i,t,o),V(i,f,o);let c=l,h=t.id;"left of"===e.note.position&&(c=t.id,h=l),r.push({id:c+"-"+h,start:c,end:h,arrowhead:"none",arrowTypeEnd:"",style:T,labelStyle:"",classes:L,pattern:"dashed",arrowheadStyle:_,labelpos:"c",labelType:x,thickness:E,look:n})}else V(i,f,o)}e.doc&&(h.R.trace("Adding nodes children "),H(e,e.doc,s,i,r,!a,n,o))},"dataFetcher"),Z=(0,d.K)(()=>{G.clear(),j=0,W=0,z.clear()},"reset"),tt=(0,d.K)((t,e=g)=>{if(!t.doc)return e;let s=e;for(let e of t.doc)"dir"===e.stmt&&(s=e.value);return s},"getDir"),te=(0,d.K)(function(t,e){return e.db.getClasses()},"getClasses"),ts=(0,d.K)(async function(t,e,s,n){h.R.info("REF0:"),h.R.info("Drawing state diagram (v2)",e);let{securityLevel:o,state:d,layout:u}=(0,c.D7)();n.db.extract(n.db.getRootDocV2());let p=n.db.getData(),y=(0,i.A)(e,o);p.type=n.type,p.layoutAlgorithm=(0,a.q7)(u),p.nodeSpacing=d?.nodeSpacing||50,p.rankSpacing=d?.rankSpacing||50,"neo"===(0,c.D7)().look?p.markers=["barbNeo"]:p.markers=["barb"],p.diagramId=e,await (0,a.XX)(p,y);try{("function"==typeof n.db.getLinks?n.db.getLinks():new Map).forEach((t,e)=>{let s,i="string"==typeof e?e:"string"==typeof e?.id?e.id:"",r=p.nodes.find(t=>t.id===i);if(!i)return void h.R.warn("\u26A0\uFE0F Invalid or missing stateId from key:",JSON.stringify(e));let a=y.node()?.querySelectorAll("g.node, g.rough-node");if(a?.forEach(t=>{let e=t.textContent?.trim();(t.id===r?.domId||e===i)&&(s=t)}),!s)return void h.R.warn("\u26A0\uFE0F Could not find node matching text:",i);let n=s.parentNode;if(!n)return void h.R.warn("\u26A0\uFE0F Node has no parent, cannot wrap:",i);let o=document.createElementNS("http://www.w3.org/2000/svg","a"),l=t.url.replace(/^"+|"+$/g,"");if(o.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",l),o.setAttribute("target","_blank"),t.tooltip){let e=t.tooltip.replace(/^"+|"+$/g,"");o.setAttribute("title",e),s.setAttribute("title",e)}n.replaceChild(o,s),o.appendChild(s),h.R.info("\u{1F517} Wrapped node in <a> tag for:",i,t.url)})}catch(t){h.R.error("\u274C Error injecting clickable links:",t)}l._K.insertTitle(y,"statediagramTitleText",d?.titleTopMargin??25,n.db.getDiagramTitle()),(0,r.P)(y,8,w,d?.useMaxWidth??!0)},"draw"),ti="start",tr="color",ta="fill",tn=(0,d.K)(()=>new Map,"newClassesList"),to=(0,d.K)(()=>({relations:[],states:new Map,documents:{}}),"newDoc"),tl=(0,d.K)(t=>JSON.parse(JSON.stringify(t)),"clone"),tc=class{constructor(t){this.version=t,this.nodes=[],this.edges=[],this.rootDoc=[],this.classes=tn(),this.documents={root:to()},this.currentDocument=this.documents.root,this.startEndCount=0,this.dividerCnt=0,this.links=new Map,this.funs=[],this.getAccTitle=c.iN,this.setAccTitle=c.SV,this.getAccDescription=c.m7,this.setAccDescription=c.EI,this.setDiagramTitle=c.ke,this.getDiagramTitle=c.ab,this.clear(),this.setRootDoc=this.setRootDoc.bind(this),this.getDividerId=this.getDividerId.bind(this),this.setDirection=this.setDirection.bind(this),this.trimColon=this.trimColon.bind(this),this.bindFunctions=this.bindFunctions.bind(this)}static{(0,d.K)(this,"StateDB")}static{this.relationType={AGGREGATION:0,EXTENSION:1,COMPOSITION:2,DEPENDENCY:3}}extract(t){for(let e of(this.clear(!0),Array.isArray(t)?t:t.doc))switch(e.stmt){case f:this.addState(e.id.trim(),e.type,e.doc,e.description,e.note);break;case S:this.addRelation(e.state1,e.state2,e.description);break;case"classDef":this.addStyleClass(e.id.trim(),e.classes);break;case"style":this.handleStyleDef(e);break;case"applyClass":this.setCssClass(e.id.trim(),e.styleClass);break;case"click":this.addLink(e.id,e.url,e.tooltip)}let e=this.getStates(),s=(0,c.D7)();for(let t of(Z(),Q(void 0,this.getRootDocV2(),e,this.nodes,this.edges,!0,s.look,this.classes),this.nodes))if(Array.isArray(t.label)){if(t.description=t.label.slice(1),t.isGroup&&t.description.length>0)throw Error(`Group nodes can only have label. Remove the additional description for node [${t.id}]`);t.label=t.label[0]}}handleStyleDef(t){let e=t.id.trim().split(","),s=t.styleClass.split(",");for(let t of e){let e=this.getState(t);if(!e){let s=t.trim();this.addState(s),e=this.getState(s)}e&&(e.styles=s.map(t=>t.replace(/;/g,"")?.trim()))}}setRootDoc(t){h.R.info("Setting root doc",t),this.rootDoc=t,1===this.version?this.extract(t):this.extract(this.getRootDocV2())}docTranslator(t,e,s){if(e.stmt===S){this.docTranslator(t,e.state1,!0),this.docTranslator(t,e.state2,!1);return}if(e.stmt===f&&("[*]"===e.id?(e.id=t.id+(s?"_start":"_end"),e.start=s):e.id=e.id.trim()),e.stmt!==m&&e.stmt!==f||!e.doc)return;let i=[],r=[];for(let t of e.doc)if(t.type===b){let e=tl(t);e.doc=tl(r),i.push(e),r=[]}else r.push(t);if(i.length>0&&r.length>0){let t={stmt:f,id:(0,l.$C)(),type:"divider",doc:tl(r)};i.push(tl(t)),e.doc=i}e.doc.forEach(t=>this.docTranslator(e,t,!0))}getRootDocV2(){return this.docTranslator({id:m,stmt:m},{id:m,stmt:m,doc:this.rootDoc},!0),{id:m,doc:this.rootDoc}}addState(t,e=k,s,i,r,a,n,o){let l=t?.trim();if(this.currentDocument.states.has(l)){let t=this.currentDocument.states.get(l);if(!t)throw Error(`State not found: ${l}`);t.doc||(t.doc=s),t.type||(t.type=e)}else h.R.info("Adding state ",l,i),this.currentDocument.states.set(l,{stmt:f,id:l,descriptions:[],type:e,doc:s,note:r,classes:[],styles:[],textStyles:[]});if(i&&(h.R.info("Setting state description",l,i),(Array.isArray(i)?i:[i]).forEach(t=>this.addDescription(l,t.trim()))),r){let t=this.currentDocument.states.get(l);if(!t)throw Error(`State not found: ${l}`);t.note=r,t.note.text=c.Y2.sanitizeText(t.note.text,(0,c.D7)())}a&&(h.R.info("Setting state classes",l,a),(Array.isArray(a)?a:[a]).forEach(t=>this.setCssClass(l,t.trim()))),n&&(h.R.info("Setting state styles",l,n),(Array.isArray(n)?n:[n]).forEach(t=>this.setStyle(l,t.trim()))),o&&(h.R.info("Setting state styles",l,n),(Array.isArray(o)?o:[o]).forEach(t=>this.setTextStyle(l,t.trim())))}clear(t){this.nodes=[],this.edges=[],this.funs=[this.setupToolTips.bind(this)],this.documents={root:to()},this.currentDocument=this.documents.root,this.startEndCount=0,this.classes=tn(),t||(this.links=new Map,(0,c.IU)())}getState(t){return this.currentDocument.states.get(t)}getStates(){return this.currentDocument.states}logDocuments(){h.R.info("Documents = ",this.documents)}getRelations(){return this.currentDocument.relations}addLink(t,e,s){this.links.set(t,{url:e,tooltip:s}),h.R.warn("Adding link",t,e,s)}getLinks(){return this.links}startIdIfNeeded(t=""){return"[*]"===t?(this.startEndCount++,`${ti}${this.startEndCount}`):t}startTypeIfNeeded(t="",e=k){return"[*]"===t?ti:e}endIdIfNeeded(t=""){return"[*]"===t?(this.startEndCount++,`end${this.startEndCount}`):t}endTypeIfNeeded(t="",e=k){return"[*]"===t?"end":e}addRelationObjs(t,e,s=""){let i=this.startIdIfNeeded(t.id.trim()),r=this.startTypeIfNeeded(t.id.trim(),t.type),a=this.startIdIfNeeded(e.id.trim()),n=this.startTypeIfNeeded(e.id.trim(),e.type);this.addState(i,r,t.doc,t.description,t.note,t.classes,t.styles,t.textStyles),this.addState(a,n,e.doc,e.description,e.note,e.classes,e.styles,e.textStyles),this.currentDocument.relations.push({id1:i,id2:a,relationTitle:c.Y2.sanitizeText(s,(0,c.D7)())})}addRelation(t,e,s){if("object"==typeof t&&"object"==typeof e)this.addRelationObjs(t,e,s);else if("string"==typeof t&&"string"==typeof e){let i=this.startIdIfNeeded(t.trim()),r=this.startTypeIfNeeded(t),a=this.endIdIfNeeded(e.trim()),n=this.endTypeIfNeeded(e);this.addState(i,r),this.addState(a,n),this.currentDocument.relations.push({id1:i,id2:a,relationTitle:s?c.Y2.sanitizeText(s,(0,c.D7)()):void 0})}}addDescription(t,e){let s=this.currentDocument.states.get(t),i=e.startsWith(":")?e.replace(":","").trim():e;s?.descriptions?.push(c.Y2.sanitizeText(i,(0,c.D7)()))}cleanupLabel(t){return t.startsWith(":")?t.slice(2).trim():t.trim()}getDividerId(){return this.dividerCnt++,`divider-id-${this.dividerCnt}`}addStyleClass(t,e=""){this.classes.has(t)||this.classes.set(t,{id:t,styles:[],textStyles:[]});let s=this.classes.get(t);e&&s&&e.split(",").forEach(t=>{let e=t.replace(/([^;]*);/,"$1").trim();if(RegExp(tr).exec(t)){let t=e.replace(ta,"bgFill").replace(tr,ta);s.textStyles.push(t)}s.styles.push(e)})}getClasses(){return this.classes}setupToolTips(t){let e=(0,n.Ck)();(0,u.Ltv)(t).select("svg").selectAll("g.node, g.rough-node").on("mouseover",t=>{let s=(0,u.Ltv)(t.currentTarget),i=s.attr("title");if(null===i)return;let r=t.currentTarget?.getBoundingClientRect();e.transition().duration(200).style("opacity",".9"),e.style("left",window.scrollX+r.left+(r.right-r.left)/2+"px").style("top",window.scrollY+r.bottom+"px"),e.html(p.A.sanitize(i)),s.classed("hover",!0)}).on("mouseout",t=>{e.transition().duration(500).style("opacity",0),(0,u.Ltv)(t.currentTarget).classed("hover",!1)})}setCssClass(t,e){t.split(",").forEach(t=>{let s=this.getState(t);if(!s){let e=t.trim();this.addState(e),s=this.getState(e)}s?.classes?.push(e)})}setStyle(t,e){this.getState(t)?.styles?.push(e)}setTextStyle(t,e){this.getState(t)?.textStyles?.push(e)}bindFunctions(t){this.funs.forEach(e=>{e(t)})}getDirectionStatement(){return this.rootDoc.find(t=>"dir"===t.stmt)}getDirection(){return this.getDirectionStatement()?.value??"TB"}setDirection(t){let e=this.getDirectionStatement();e?e.value=t:this.rootDoc.unshift({stmt:"dir",value:t})}trimColon(t){return t.startsWith(":")?t.slice(1).trim():t.trim()}getData(){let t=(0,c.D7)();for(let e of this.nodes)e.wrappingWidth??=t.state?.wrappingWidth,e.isGroup||(e.minWidth??=t.state?.minNodeWidth);return{nodes:this.nodes,edges:this.edges,other:{},config:t,direction:tt(this.getRootDocV2())}}getConfig(){return(0,c.D7)().state}},th=(0,d.K)(t=>{let{theme:e,bkgColorArray:s,borderColorArray:i}=t;if(!(0,o.P1)(e,i))return"";let r=(0,o.rq)(t.look),a=(0,o.Ic)(s),n="";for(let t=0;t<(0,o.Hu)(i);t++){let e=i[t],o=a?`fill: ${s[t%s.length]};`:"",l=`[data-look="${r}"][data-color-id="color-${t}"]`;n+=`

    /* The title strip: \`rect.outer\` spans the whole composite and \`rect.inner\` covers
       the body, so what stays visible of \`outer\` is the band behind the label. */
    ${l}.statediagram-cluster rect.outer {
      stroke: ${e};
      ${o}
    }

    ${l}.statediagram-cluster rect.inner {
      stroke: ${e};
    }

    /* Concurrency regions. Siblings of one composite share a slot, so a divided composite
       reads as one thing split into parts rather than as several composites. */
    ${l}.statediagram-cluster rect.divider {
      stroke: ${e};
      ${o}
    }

    /* handDrawn draws the same container as roughjs shapes rather than plain rects, so it
       needs its own rules. \`roundedWithTitle\` and \`divider\` name those groups \`outer\`,
       \`inner\` and \`divider\` to match the classic branch, which is what lets these
       discriminate -- a bare \`.statediagram-cluster path\` rule reached the body as well and
       tinted the whole composite, losing \`compositeBackground\` and diverging from what
       classic and neo do.

       roughjs emits two paths per shape and marks them: the filled shape carries
       \`stroke="none"\` and the sketched outline carries \`fill="none"\`. Splitting on that is
       what keeps \`fill\` off the outline -- a rough outline is open squiggles, not a closed
       region, so filling it produces smears -- and keeps \`stroke\` off the fill shape, which
       would otherwise gain an edge it was drawn without. */
    ${l}.statediagram-cluster .outer path[stroke='none'] {
      ${o}
    }

    ${l}.statediagram-cluster .outer path[fill='none'] {
      stroke: ${e};
    }

    /* No \`.inner\` rule on purpose. The body shape is left entirely alone under handDrawn,
       where a rect's \`inner\` counterpart cannot be recoloured safely: roughjs draws a
       hachure fill as *stroked* lines, so its fill paths carry \`fill="none"\` exactly like
       the outline and no selector separates them. An \`.inner\` stroke rule therefore
       repainted the hatching of every alt composite in the palette colour instead of
       leaving it on \`altBackground\`. The container still reads as palette-coloured: the
       \`outer\` shape spans the whole composite, so its outline already frames the body. */

    /* Regions split the same way, which is why \`divider\` fills solid rather than taking
       roughjs's default hachure -- see the note on that call. Hatched, both of its paths
       carried \`fill="none"\` and these two rules degenerated: the tint matched nothing and
       the border rule repainted the hatching. */
    ${l}.statediagram-cluster .divider path[stroke='none'] {
      ${o}
    }

    ${l}.statediagram-cluster .divider path[fill='none'] {
      stroke: ${e};
    }
    `}return n},"genColor"),td={parser:y,get db(){return new tc(2)},renderer:{getClasses:te,draw:ts,getDir:tt},styles:(0,d.K)(t=>`
${th(t)}
defs [id$="-barbEnd"] {
    fill: ${t.transitionColor};
    stroke: ${t.transitionColor};
  }
g.stateGroup text {
  fill: ${t.nodeBorder};
  stroke: none;
  font-size: 10px;
}
g.stateGroup text {
  fill: ${t.textColor};
  stroke: none;
  font-size: 10px;

}
g.stateGroup .state-title {
  font-weight: bolder;
  fill: ${t.stateLabelColor};
}

g.stateGroup rect {
  fill: ${t.mainBkg};
  stroke: ${t.nodeBorder};
}

g.stateGroup line {
  stroke: ${t.lineColor};
  stroke-width: ${t.strokeWidth||1};
}

.transition {
  stroke: ${t.transitionColor};
  stroke-width: ${t.strokeWidth||1};
  fill: none;
}

.stateGroup .composit {
  fill: ${t.background};
  border-bottom: 1px
}

.stateGroup .alt-composit {
  fill: #e0e0e0;
  border-bottom: 1px
}

.state-note {
  stroke: ${t.noteBorderColor};
  fill: ${t.noteBkgColor};

  text {
    fill: ${t.noteTextColor};
    stroke: none;
    font-size: 10px;
  }
}

.stateLabel .box {
  stroke: none;
  stroke-width: 0;
  fill: ${t.mainBkg};
  opacity: 0.5;
}

.edgeLabel .label rect {
  fill: ${t.labelBackgroundColor};
  opacity: 0.5;
}
.edgeLabel {
  background-color: ${t.edgeLabelBackground};
  p {
    background-color: ${t.edgeLabelBackground};
  }
  rect {
    opacity: 0.5;
    background-color: ${t.edgeLabelBackground};
    fill: ${t.edgeLabelBackground};
  }
  text-align: center;
}
.edgeLabel .label text {
  fill: ${t.transitionLabelColor||t.tertiaryTextColor};
}
.label div .edgeLabel {
  color: ${t.transitionLabelColor||t.tertiaryTextColor};
}

.stateLabel text {
  fill: ${t.stateLabelColor};
  font-size: 10px;
  font-weight: bold;
}

.node circle.state-start {
  fill: ${t.specialStateColor};
  stroke: ${t.specialStateColor};
}

.node .fork-join {
  fill: ${t.specialStateColor};
  stroke: ${t.specialStateColor};
}

.node circle.state-end {
  fill: ${t.innerEndBackground};
  stroke: ${t.background};
  stroke-width: 1.5
}
.end-state-inner {
  fill: ${t.compositeBackground||t.background};
  // stroke: ${t.background};
  stroke-width: 1.5
}

.node rect {
  fill: ${t.stateBkg||t.mainBkg};
  stroke: ${t.stateBorder||t.nodeBorder};
  stroke-width: ${t.strokeWidth||1}px;
}
.node polygon {
  fill: ${t.mainBkg};
  stroke: ${t.stateBorder||t.nodeBorder};;
  stroke-width: ${t.strokeWidth||1}px;
}
[id$="-barbEnd"] {
  fill: ${t.lineColor};
}

.statediagram-cluster rect {
  fill: ${t.compositeTitleBackground};
  stroke: ${t.stateBorder||t.nodeBorder};
  stroke-width: ${t.strokeWidth||1}px;
}

.cluster-label, .nodeLabel {
  color: ${t.stateLabelColor};
  // line-height: 1;
}

.statediagram-cluster rect.outer {
  rx: 5px;
  ry: 5px;
}
.statediagram-state .divider {
  stroke: ${t.stateBorder||t.nodeBorder};
}

.statediagram-state .title-state {
  rx: 5px;
  ry: 5px;
}
.statediagram-cluster.statediagram-cluster .inner {
  fill: ${t.compositeBackground||t.background};
}
.statediagram-cluster.statediagram-cluster-alt .inner {
  fill: ${t.altBackground?t.altBackground:"#efefef"};
}

.statediagram-cluster .inner {
  rx:0;
  ry:0;
}

.statediagram-state rect.basic {
  rx: 5px;
  ry: 5px;
}
.statediagram-state rect.divider {
  stroke-dasharray: 10,10;
  fill: ${t.altBackground?t.altBackground:"#efefef"};
}

.note-edge {
  stroke-dasharray: 5;
}

.statediagram-note rect {
  fill: ${t.noteBkgColor};
  stroke: ${t.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}
.statediagram-note rect {
  fill: ${t.noteBkgColor};
  stroke: ${t.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}

.statediagram-note text {
  fill: ${t.noteTextColor};
}

.statediagram-note .nodeLabel {
  color: ${t.noteTextColor};
}
.statediagram .edgeLabel {
  color: red; // ${t.noteTextColor};
}

[id$="-dependencyStart"], [id$="-dependencyEnd"] {
  fill: ${t.lineColor};
  stroke: ${t.lineColor};
  stroke-width: ${t.strokeWidth||1};
}

.statediagramTitleText {
  text-anchor: middle;
  font-size: 18px;
  fill: ${t.textColor};
}

[data-look="neo"].statediagram-cluster rect {
  fill: ${t.mainBkg};
  stroke: ${t.useGradient?"url("+t.svgId+"-gradient)":t.stateBorder||t.nodeBorder};
  stroke-width: ${t.strokeWidth??1};
}
[data-look="neo"].statediagram-cluster rect.outer {
  rx: ${t.radius}px;
  ry: ${t.radius}px;
  filter: ${t.dropShadow?t.dropShadow.replace("url(#drop-shadow)",`url(${t.svgId}-drop-shadow)`):"none"}
}
`,"getStyles"),init:(0,d.K)(t=>{t.state||(t.state={}),t.state.arrowMarkerAbsolute=t.arrowMarkerAbsolute},"init")}}}]);