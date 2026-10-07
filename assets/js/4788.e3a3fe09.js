"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([["4788"],{77454(t,e,a){function r(t,e){t.accDescr&&e.setAccDescription?.(t.accDescr),t.accTitle&&e.setAccTitle?.(t.accTitle),t.title&&e.setDiagramTitle?.(t.title)}a.d(e,{S:()=>r}),(0,a(86827).K)(r,"populateCommonDb")},25487(t,e,a){a.d(e,{diagram:()=>R});var r=a(77454),i=a(14924),n=a(86348),l=a(81177),s=a(31293),o=a(86827),c=a(78731),d={showLegend:!0,ticks:5,max:null,min:0,graticule:"circle"},g={axes:[],curves:[],options:d},u=structuredClone(g),p=l.UI.radar,x=(0,o.K)(()=>(0,n.$t)({...p,...(0,l.zj)().radar}),"getConfig"),h=(0,o.K)(()=>u.axes,"getAxes"),m=(0,o.K)(()=>u.curves,"getCurves"),$=(0,o.K)(()=>u.options,"getOptions"),f=(0,o.K)(t=>{u.axes=t.map(t=>({name:t.name,label:t.label??t.name}))},"setAxes"),y=(0,o.K)(t=>{u.curves=t.map(t=>({name:t.name,label:t.label??t.name,entries:v(t.entries)}))},"setCurves"),v=(0,o.K)(t=>{if(void 0==t[0].axis)return t.map(t=>t.value);let e=h();if(0===e.length)throw Error("Axes must be populated before curves for reference entries");return e.map(e=>{let a=t.find(t=>t.axis?.$refText===e.name);if(void 0===a)throw Error("Missing entry for axis "+e.label);return a.value})},"computeCurveEntries"),w={getAxes:h,getCurves:m,getOptions:$,setAxes:f,setCurves:y,setOptions:(0,o.K)(t=>{let e=t.reduce((t,e)=>(t[e.name]=e,t),{});u.options={showLegend:e.showLegend?.value??d.showLegend,ticks:e.ticks?.value??d.ticks,max:e.max?.value??d.max,min:e.min?.value??d.min,graticule:e.graticule?.value??d.graticule},u.options.ticks>32&&(s.R.warn(`Radar diagram ticks (${u.options.ticks}) exceeds maximum allowed (32). Using 32 instead.`),u.options.ticks=32)},"setOptions"),getConfig:x,clear:(0,o.K)(()=>{(0,l.IU)(),u=structuredClone(g)},"clear"),setAccTitle:l.SV,getAccTitle:l.iN,setDiagramTitle:l.ke,getDiagramTitle:l.ab,getAccDescription:l.m7,setAccDescription:l.EI},b=(0,o.K)(t=>{(0,r.S)(t,w);let{axes:e,curves:a,options:i}=t;w.setAxes(e),w.setCurves(a),w.setOptions(i)},"populate"),C={parse:(0,o.K)(async t=>{let e=await (0,c.qg)("radar",t);s.R.debug(e),b(e)},"parse")},k=(0,o.K)((t,e,a,r)=>{let n=r.db,l=n.getAxes(),s=n.getCurves(),o=n.getOptions(),c=n.getConfig(),d=n.getDiagramTitle(),g=K((0,i.D)(e),c),u=o.max??Math.max(...s.map(t=>Math.max(...t.entries))),p=o.min,x=Math.min(c.width,c.height)/2;M(g,l,x,o.ticks,o.graticule),L(g,l,x,c),T(g,l,s,p,u,o.graticule,c),I(g,s,o.showLegend,c),g.append("text").attr("class","radarTitle").text(d).attr("x",0).attr("y",-c.height/2-c.marginTop)},"draw"),K=(0,o.K)((t,e)=>{let a=e.width+e.marginLeft+e.marginRight,r=e.height+e.marginTop+e.marginBottom,i={x:e.marginLeft+e.width/2,y:e.marginTop+e.height/2};return(0,l.a$)(t,r,a,e.useMaxWidth??!0),t.attr("viewBox",`0 0 ${a} ${r}`).attr("overflow","visible"),t.append("g").attr("transform",`translate(${i.x}, ${i.y})`)},"drawFrame"),M=(0,o.K)((t,e,a,r,i)=>{if("circle"===i)for(let e=0;e<r;e++){let i=a*(e+1)/r;t.append("circle").attr("r",i).attr("class","radarGraticule")}else if("polygon"===i){let i=e.length;for(let n=0;n<r;n++){let l=a*(n+1)/r,s=e.map((t,e)=>{let a=2*e*Math.PI/i-Math.PI/2,r=l*Math.cos(a),n=l*Math.sin(a);return`${r},${n}`}).join(" ");t.append("polygon").attr("points",s).attr("class","radarGraticule")}}},"drawGraticule"),L=(0,o.K)((t,e,a,r)=>{let i=e.length;for(let n=0;n<i;n++){let l=e[n].label,s=2*n*Math.PI/i-Math.PI/2,o=Math.cos(s),c=Math.sin(s);t.append("line").attr("x1",0).attr("y1",0).attr("x2",a*r.axisScaleFactor*o).attr("y2",a*r.axisScaleFactor*c).attr("class","radarAxisLine");let d=o>.01?"start":o<-.01?"end":"middle",g=c>.01?"hanging":c<-.01?"auto":"central";t.append("text").text(l).attr("x",a*r.axisLabelFactor*o+4*o).attr("y",a*r.axisLabelFactor*c+4*c).attr("text-anchor",d).attr("dominant-baseline",g).attr("class","radarAxisLabel")}},"drawAxes");function T(t,e,a,r,i,n,l){let s=e.length,o=Math.min(l.width,l.height)/2;a.forEach((e,a)=>{if(e.entries.length!==s)return;let c=e.entries.map((t,e)=>{let a=2*Math.PI*e/s-Math.PI/2,n=A(t,r,i,o);return{x:n*Math.cos(a),y:n*Math.sin(a)}});"circle"===n?t.append("path").attr("d",S(c,l.curveTension)).attr("class",`radarCurve-${a}`):"polygon"===n&&t.append("polygon").attr("points",c.map(t=>`${t.x},${t.y}`).join(" ")).attr("class",`radarCurve-${a}`)})}function A(t,e,a,r){return r*(Math.min(Math.max(t,e),a)-e)/(a-e)}function S(t,e){let a=t.length,r=`M${t[0].x},${t[0].y}`;for(let i=0;i<a;i++){let n=t[(i-1+a)%a],l=t[i],s=t[(i+1)%a],o=t[(i+2)%a],c={x:l.x+(s.x-n.x)*e,y:l.y+(s.y-n.y)*e},d={x:s.x-(o.x-l.x)*e,y:s.y-(o.y-l.y)*e};r+=` C${c.x},${c.y} ${d.x},${d.y} ${s.x},${s.y}`}return`${r} Z`}function I(t,e,a,r){if(!a)return;let i=(r.width/2+r.marginRight)*3/4,n=-(3*(r.height/2+r.marginTop))/4;e.forEach((e,a)=>{let r=t.append("g").attr("transform",`translate(${i}, ${n+20*a})`);r.append("rect").attr("width",12).attr("height",12).attr("class",`radarLegendBox-${a}`),r.append("text").attr("x",16).attr("y",0).attr("class","radarLegendText").text(e.label)})}(0,o.K)(T,"drawCurves"),(0,o.K)(A,"relativeRadius"),(0,o.K)(S,"closedRoundCurve"),(0,o.K)(I,"drawLegend");var D=(0,o.K)((t,e)=>{let a="";for(let r=0;r<t.THEME_COLOR_LIMIT;r++){let i=t[`cScale${r}`];a+=`
		.radarCurve-${r} {
			color: ${i};
			fill: ${i};
			fill-opacity: ${e.curveOpacity};
			stroke: ${i};
			stroke-width: ${e.curveStrokeWidth};
		}
		.radarLegendBox-${r} {
			fill: ${i};
			fill-opacity: ${e.curveOpacity};
			stroke: ${i};
		}
		`}return a},"genIndexStyles"),O=(0,o.K)(t=>{let e=(0,l.P$)(),a=(0,l.zj)(),r=(0,n.$t)(e,a.themeVariables),i=(0,n.$t)(r.radar,t);return{themeVariables:r,radarOptions:i}},"buildRadarStyleOptions"),R={parser:C,db:w,renderer:{draw:k},styles:(0,o.K)(({radar:t}={})=>{let{themeVariables:e,radarOptions:a}=O(t);return`
	.radarTitle {
		font-size: ${e.fontSize};
		color: ${e.titleColor};
		dominant-baseline: hanging;
		text-anchor: middle;
	}
	.radarAxisLine {
		stroke: ${a.axisColor};
		stroke-width: ${a.axisStrokeWidth};
	}
	.radarAxisLabel {
		font-size: ${a.axisLabelFontSize}px;
		color: ${a.axisColor};
	}
	.radarGraticule {
		fill: ${a.graticuleColor};
		fill-opacity: ${a.graticuleOpacity};
		stroke: ${a.graticuleColor};
		stroke-width: ${a.graticuleStrokeWidth};
	}
	.radarLegendText {
		text-anchor: start;
		font-size: ${a.legendFontSize}px;
		dominant-baseline: hanging;
	}
	${D(e,a)}
	`},"styles")}}}]);