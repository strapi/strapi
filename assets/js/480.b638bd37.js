"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([["480"],{77454(t,e,a){function n(t,e){t.accDescr&&e.setAccDescription?.(t.accDescr),t.accTitle&&e.setAccTitle?.(t.accTitle),t.title&&e.setDiagramTitle?.(t.title)}a.d(e,{S:()=>n}),(0,a(86827).K)(n,"populateCommonDb")},77475(t,e,a){a.d(e,{diagram:()=>B});var n=a(77454),r=a(14924),i=a(86348),o=a(81177),l=a(31293),c=a(86827),s=a(78731),d=(0,c.K)(()=>({domains:new Map,transitions:[]}),"createDefaultData"),f=d(),p=(0,c.K)(()=>f.domains,"getDomains"),y={getDomains:p,getTransitions:(0,c.K)(()=>f.transitions,"getTransitions"),setDomains:(0,c.K)(t=>{if(t)for(let e of t){let t=e.domain,a=(e.items??[]).map(t=>({label:t.label}));f.domains.set(t,{name:t,items:a})}},"setDomains"),setTransitions:(0,c.K)(t=>{t&&(f.transitions=t.filter(t=>t.from!==t.to||(l.R.warn(`Cynefin: self-loop transition on domain "${t.from}" is not meaningful and will be skipped.`),!1)).map(t=>({from:t.from,to:t.to,label:t.label||void 0})))},"setTransitions"),getConfig:(0,c.K)(()=>(0,i.$t)({...o.UI.cynefin,...(0,o.zj)().cynefin}),"getConfig"),clear:(0,c.K)(()=>{(0,o.IU)(),f=d()},"clear"),setAccTitle:o.SV,getAccTitle:o.iN,setDiagramTitle:o.ke,getDiagramTitle:o.ab,getAccDescription:o.m7,setAccDescription:o.EI},m=(0,c.K)(t=>{(0,n.S)(t,y),y.setDomains(t.domains),y.setTransitions(t.transitions)},"populate"),x={parse:(0,c.K)(async t=>{let e=await (0,s.qg)("cynefin",t);l.R.debug(e),m(e)},"parse")};function h(t){let e=t+0x6d2b79f5|0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}function $(t){let e=0;for(let a=0;a<t.length;a++)e=(e<<5)-e+t.charCodeAt(a)|0;return e}function g(t,e){return"number"==typeof t&&Number.isFinite(t)&&0!==t?t:$(e)}function u(t,e,a,n){let r=t/2,i=n??.015*t,o=e/7,l=[];for(let t=0;t<=7;t++){let e=h(a+17*t)*i*2-i;l.push({x:r+e,y:t*o})}let c=`M${l[0].x},${l[0].y}`;for(let t=0;t<l.length-1;t++){let e=l[t],n=l[t+1],r=(e.y+n.y)/2,o=1.5*i*(t%2==0?1:-1)*h(a+31*t+7),s=e.x+o,d=n.x-o;c+=` C${s},${r} ${d},${r} ${n.x},${n.y}`}return c}function b(t,e,a,n){let r=e/2,i=n??.015*e,o=t/7,l=[];for(let t=0;t<=7;t++){let e=h(a+23*t)*i*2-i;l.push({x:t*o,y:r+e})}let c=`M${l[0].x},${l[0].y}`;for(let t=0;t<l.length-1;t++){let e=l[t],n=l[t+1],r=(e.x+n.x)/2,o=1.5*i*(t%2==0?1:-1)*h(a+37*t+11),s=e.y+o,d=n.y-o;c+=` C${r},${s} ${r},${d} ${n.x},${n.y}`}return c}function w(t,e){let a=t/2,n=.5*e,r=.03*t;return`M${a},${n} C${a+r},${n+(e-n)*.2} ${a-1.5*r},${n+(e-n)*.55} ${a+.5*r},${n+(e-n)*.75} C${a-r},${n+(e-n)*.85} ${a+.3*r},${n+(e-n)*.95} ${a},${e}`}function C(t,e,a,n){return`M${t-a},${e} A${a},${n} 0 1,1 ${t+a},${e} A${a},${n} 0 1,1 ${t-a},${e} Z`}(0,c.K)(h,"seededRandom"),(0,c.K)($,"hashString"),(0,c.K)(g,"resolveSeed"),(0,c.K)(u,"generateFoldPath"),(0,c.K)(b,"generateHorizontalBoundary"),(0,c.K)(w,"generateCliffPath"),(0,c.K)(C,"generateConfusionPath");var k={complex:{model:"Probe \u2192 Sense \u2192 Respond",practice:"Emergent Practices"},complicated:{model:"Sense \u2192 Analyse \u2192 Respond",practice:"Good Practices"},clear:{model:"Sense \u2192 Categorise \u2192 Respond",practice:"Best Practices"},chaotic:{model:"Act \u2192 Sense \u2192 Respond",practice:"Novel Practices"},confusion:{model:"",practice:"Disorder"}},D=(0,c.K)((t,e)=>{let a=t/2,n=e/2;return{complex:{cx:a/2,cy:n/2,x:0,y:0,w:a,h:n},complicated:{cx:a+a/2,cy:n/2,x:a,y:0,w:a,h:n},chaotic:{cx:a/2,cy:n+n/2,x:0,y:n,w:a,h:n},clear:{cx:a+a/2,cy:n+n/2,x:a,y:n,w:a,h:n},confusion:{cx:a,cy:n,x:.7*a,y:.7*n,w:.6*a,h:.6*n}}},"getDomainLayouts"),K=(0,c.K)(()=>{let t=(0,o.P$)(),e=(0,o.zj)();return(0,i.$t)(t,e.themeVariables).cynefin},"getCynefinDomainColors"),T=(0,c.K)((t,e,a,n)=>{let i=n.db,c=i.getDomains(),s=i.getTransitions(),d=i.getDiagramTitle(),f=i.getAccTitle(),p=i.getAccDescription(),y=i.getConfig(),m=K();l.R.debug("Rendering Cynefin diagram");let x=y.width,h=y.height,$=y.padding,T=y.showDomainDescriptions,A=y.boundaryAmplitude,B=x+2*$,S=h+2*$,z={complex:m.complexBg,complicated:m.complicatedBg,clear:m.clearBg,chaotic:m.chaoticBg,confusion:m.confusionBg},v=(0,r.D)(e);(0,o.a$)(v,S,B,y.useMaxWidth??!0),v.attr("viewBox",`0 0 ${B} ${S}`),f&&v.append("title").text(f),p&&v.append("desc").text(p);let M=v.append("g").attr("transform",`translate(${$}, ${$})`),I=D(x,h),L=g(y.seed,e),P=M.append("g").attr("class","cynefin-backgrounds"),R=["complex","complicated","chaotic","clear"];for(let t of R){let e=I[t];P.append("rect").attr("class","cynefinDomain").attr("x",e.x).attr("y",e.y).attr("width",e.w).attr("height",e.h).attr("fill",z[t]).attr("fill-opacity",.4).attr("stroke","none")}let F=M.append("g").attr("class","cynefin-boundaries");F.append("path").attr("class","cynefinBoundary").attr("d",u(x,h,L,A)).attr("fill","none"),F.append("path").attr("class","cynefinBoundary").attr("d",b(x,h,L+100,A)).attr("fill","none"),F.append("path").attr("class","cynefinCliff").attr("d",w(x,h)).attr("fill","none");let W=.15*x,E=.15*h;M.append("path").attr("class","cynefinConfusion").attr("d",C(x/2,h/2,W,E)).attr("fill",z.confusion).attr("fill-opacity",.5);let H=M.append("g").attr("class","cynefin-labels");for(let t of R){let e=I[t];H.append("text").attr("class","cynefinDomainLabel").attr("x",e.cx).attr("y",T?e.cy-30:e.cy).attr("text-anchor","middle").attr("dominant-baseline","middle").text(t.charAt(0).toUpperCase()+t.slice(1))}if(H.append("text").attr("class","cynefinDomainLabel").attr("x",x/2).attr("y",T?h/2-10:h/2).attr("text-anchor","middle").attr("dominant-baseline","middle").text("Confusion"),T){let t=M.append("g").attr("class","cynefin-subtitles");for(let e of R){let a=I[e],n=k[e];t.append("text").attr("class","cynefinSubtitle").attr("x",a.cx).attr("y",a.cy-10).attr("text-anchor","middle").attr("dominant-baseline","middle").text(n.model),t.append("text").attr("class","cynefinSubtitle").attr("x",a.cx).attr("y",a.cy+5).attr("text-anchor","middle").attr("dominant-baseline","middle").text(n.practice)}t.append("text").attr("class","cynefinSubtitle").attr("x",x/2).attr("y",h/2+8).attr("text-anchor","middle").attr("dominant-baseline","middle").text(k.confusion.practice)}let j=M.append("g").attr("class","cynefin-items");for(let t of["complex","complicated","chaotic","clear","confusion"]){let e,a=c.get(t);if(!a||0===a.items.length)continue;let n=I[t],r="confusion"===t,i=a.items,o=0;if(r&&a.items.length>3&&(o=a.items.length-3,i=a.items.slice(0,3)),r){let t=T?22:14;e=n.cy+t}else e=n.cy+(T?25:15);if([...i].forEach((a,r)=>{let i=e+30*r,o=j.append("g"),l=o.append("text").attr("class","cynefinItemText").attr("x",0).attr("y",13).attr("text-anchor","middle").attr("dominant-baseline","central").text(a.label),c=7*a.label.length,s=l.node();if(s&&"function"==typeof s.getBBox){let t=s.getBBox();t.width>0&&(c=t.width)}let d=c+20,f=n.cx-d/2;o.attr("transform",`translate(${f}, ${i})`),o.insert("rect","text").attr("class","cynefinItem").attr("x",0).attr("y",0).attr("width",d).attr("height",26).attr("rx",4).attr("ry",4).attr("fill",z[t]).attr("fill-opacity",.95),l.attr("x",d/2).attr("y",13)}),o>0){let a=e+30*i.length,r=`+${o} more`,l=j.append("g"),c=l.append("text").attr("class","cynefinItemText").attr("x",0).attr("y",13).attr("text-anchor","middle").attr("dominant-baseline","central").text(r),s=7*r.length,d=c.node();if(d&&"function"==typeof d.getBBox){let t=d.getBBox();t.width>0&&(s=t.width)}let f=s+20,p=n.cx-f/2;l.attr("transform",`translate(${p}, ${a})`),l.insert("rect","text").attr("class","cynefinItemOverflow").attr("x",0).attr("y",0).attr("width",f).attr("height",26).attr("rx",4).attr("ry",4).attr("fill",z[t]).attr("fill-opacity",.6),c.attr("x",f/2).attr("y",13)}}if(s.length>0){let t=v.select("defs").empty()?v.append("defs"):v.select("defs"),a=`cynefin-arrow-${e}`;t.append("marker").attr("id",a).attr("viewBox","0 0 10 10").attr("refX",9).attr("refY",5).attr("markerWidth",6).attr("markerHeight",6).attr("orient","auto-start-reverse").append("path").attr("d","M 0 0 L 10 5 L 0 10 z").attr("class","cynefinArrowHead");let n=M.append("g").attr("class","cynefin-arrows");s.forEach(t=>{let e=I[t.from],r=I[t.to];if(!e||!r)return;if(t.from===t.to)return void l.R.warn(`Cynefin renderer: skipping self-loop on domain "${t.from}"`);let i=e.cx,o=e.cy,c=r.cx,s=r.cy,d=c-i,f=s-o,p=Math.sqrt(d*d+f*f),y=.15*p,m=(i+c)/2+-f/p*y,x=(o+s)/2+d/p*y;n.append("path").attr("class","cynefinArrowLine").attr("d",`M${i},${o} Q${m},${x} ${c},${s}`).attr("fill","none").attr("marker-end",`url(#${a})`),t.label&&n.append("text").attr("class","cynefinArrowLabel").attr("x",m).attr("y",x-6).attr("text-anchor","middle").attr("dominant-baseline","auto").text(t.label)})}d&&M.append("text").attr("class","cynefinTitle").attr("x",x/2).attr("y",-$/2).attr("text-anchor","middle").attr("dominant-baseline","middle").text(d)},"draw"),A=(0,c.K)(()=>{let t=(0,o.P$)(),e=(0,o.zj)();return(0,i.$t)(t,e.themeVariables).cynefin},"getCynefinTheme"),B={parser:x,db:y,renderer:{draw:T},styles:(0,c.K)(()=>{let t=A();return`
	.cynefinDomain {
		stroke: none;
	}
	.cynefinDomainLabel {
		font-size: ${t.domainFontSize}px;
		font-weight: bold;
		fill: ${t.labelColor};
	}
	.cynefinSubtitle {
		font-size: ${t.itemFontSize-1}px;
		fill: ${t.textColor};
		font-style: italic;
	}
	.cynefinItem {
		fill-opacity: 0.95;
		stroke: ${t.boundaryColor};
		stroke-width: 1;
	}
	.cynefinItemText {
		font-size: ${t.itemFontSize}px;
		fill: ${t.textColor};
	}
	.cynefinItemOverflow {
		fill-opacity: 0.6;
		stroke: ${t.boundaryColor};
		stroke-width: 1;
		stroke-dasharray: 3 2;
	}
	.cynefinBoundary {
		stroke: ${t.boundaryColor};
		stroke-width: ${t.boundaryWidth};
		stroke-dasharray: 6 3;
	}
	.cynefinCliff {
		stroke: ${t.cliffColor};
		stroke-width: ${t.cliffWidth};
	}
	.cynefinConfusion {
		stroke: ${t.boundaryColor};
		stroke-width: 1.5;
		stroke-dasharray: 4 2;
	}
	.cynefinArrowLine {
		stroke: ${t.arrowColor};
		stroke-width: ${t.arrowWidth};
		fill: none;
	}
	.cynefinArrowHead {
		fill: ${t.arrowColor};
		stroke: none;
	}
	.cynefinArrowLabel {
		font-size: ${t.itemFontSize-1}px;
		fill: ${t.textColor};
	}
	.cynefinTitle {
		font-size: ${t.domainFontSize+2}px;
		font-weight: bold;
		fill: ${t.labelColor};
	}
	`},"styles")}}}]);