import{useState as P,useEffect as R9,useRef as F1} from"react";import a1 from"next/image";import{jsxDEV as X1,Fragment as l1} from"react/jsx-dev-runtime";function Y1({image:Z}){return X1("div",{className:"track-image w-64 h-64 md:w-40 md:h-40 flex items-center justify-center bg-neutral-900/30 border border-neutral-900 rounded-sm",children:Z?X1(a1,{src:Z.src,alt:Z.alt,width:256,height:256,priority:!0},void 0,!1,void 0,this):X1(l1,{children:"\uD83C\uDF10"},void 0,!1,void 0,this)},void 0,!1,void 0,this)}import{jsxDEV as o} from"react/jsx-dev-runtime";function q1({track:Z}){return o("div",{className:"track-info h-full py-2 flex flex-col justify-between gap-1 md:gap-0",children:[o("span",{className:"text-xl md:text-2xl font-mono font-black",children:Z.title},void 0,!1,void 0,this),o("span",{className:"md:text-lg font-medium",children:Z.artist},void 0,!1,void 0,this),o("span",{className:"text-sm md:text-base font-mono font-bold",children:Z.record},void 0,!1,void 0,this)]},void 0,!0,void 0,this)}import{jsxDEV as L} from"react/jsx-dev-runtime";function J1({trackDuration:Z,currentTime:H,audioRef:C,progressBarRef:X}){function Y(J){if(J===0)return"00:00";const U=Math.floor(J/60),V=Math.floor(J%60),K=U<10?`0${U}`:`${U}`,M=V<10?`0${V}`:`${V}`;return`${K}:${M}`}function q(J){if(console.log("[TrackProgressBar] onProgressBarChange: ",parseInt(J.target.value)),!C.current)return;C.current.currentTime=parseInt(J.target.value)}return L("div",{className:"track-progress-bar flex-grow w-full flex flex-row items-center justify-between gap-2",children:[L("div",{className:"w-[56px] p-2 flex flex-row items-center justify-center border dark:border-neutral-900 rounded-sm",children:L("span",{className:"text-sm font-mono font-bold tracking-wide",children:Y(H)},void 0,!1,void 0,this)},void 0,!1,void 0,this),L("div",{className:"w-full flex flex-row items-center justify-center",children:L("input",{type:"range",ref:X,onChange:q,value:H,max:Math.round(Z),className:"w-full accent-green-600 dark:accent-green-500"},void 0,!1,void 0,this)},void 0,!1,void 0,this),L("div",{className:"w-[56px] p-2 flex flex-row items-center justify-center border dark:border-neutral-900 rounded-sm",children:L("span",{className:"text-sm font-mono font-bold tracking-wide",children:Y(Z)},void 0,!1,void 0,this)},void 0,!1,void 0,this)]},void 0,!0,void 0,this)}import*as R1 from"react";function b(){return b=Object.assign?Object.assign.bind():function(Z){for(var H=1;H<arguments.length;H++){var C=arguments[H];for(var X in C)if(Object.prototype.hasOwnProperty.call(C,X))Z[X]=C[X]}return Z},b.apply(this,arguments)}import{forwardRef as T1,Children as m,isValidElement as r,createElement as U1,cloneElement as A1,Fragment as t1} from"react";import{useCallback as c9} from"react";var c1=function(Z,H){if(typeof Z==="function")Z(H);else if(Z!==null&&Z!==void 0)Z.current=H},B1=function(...Z){return(H)=>Z.forEach((C)=>c1(C,H))};var o1=function(Z){return r(Z)&&Z.type===f1},r1=function(Z,H){const C={...H};for(let X in H){const Y=Z[X],q=H[X];if(/^on[A-Z]/.test(X)){if(Y&&q)C[X]=(...U)=>{q(...U),Y(...U)};else if(Y)C[X]=Y}else if(X==="style")C[X]={...Y,...q};else if(X==="className")C[X]=[Y,q].filter(Boolean).join(" ")}return{...Z,...C}},K1=T1((Z,H)=>{const{children:C,...X}=Z,Y=m.toArray(C),q=Y.find(o1);if(q){const J=q.props.children,U=Y.map((V)=>{if(V===q){if(m.count(J)>1)return m.only(null);return r(J)?J.props.children:null}else return V});return U1(Q1,b({},X,{ref:H}),r(J)?A1(J,void 0,U):null)}return U1(Q1,b({},X,{ref:H}),C)});K1.displayName="Slot";var Q1=T1((Z,H)=>{const{children:C,...X}=Z;if(r(C))return A1(C,{...r1(X,C.props),ref:H?B1(H,C.ref):C.ref});return m.count(C)>1?m.only(null):null});Q1.displayName="SlotClone";var f1=({children:Z})=>{return U1(t1,null,Z)};var S1=function(Z){var H,C,X="";if(typeof Z=="string"||typeof Z=="number")X+=Z;else if(typeof Z=="object")if(Array.isArray(Z))for(H=0;H<Z.length;H++)Z[H]&&(C=S1(Z[H]))&&(X&&(X+=" "),X+=C);else for(H in Z)Z[H]&&(X&&(X+=" "),X+=H);return X};function k1(){for(var Z,H,C=0,X="";C<arguments.length;)(Z=arguments[C++])&&(H=S1(Z))&&(X&&(X+=" "),X+=H);return X}var y1=(Z)=>typeof Z==="boolean"?"".concat(Z):Z===0?"0":Z,g1=k1,j1=(Z,H)=>{return(C)=>{var X;if((H===null||H===void 0?void 0:H.variants)==null)return g1(Z,C===null||C===void 0?void 0:C.class,C===null||C===void 0?void 0:C.className);const{variants:Y,defaultVariants:q}=H,J=Object.keys(Y).map((K)=>{const M=C===null||C===void 0?void 0:C[K],G=q===null||q===void 0?void 0:q[K];if(M===null)return null;const D=y1(M)||y1(G);return Y[K][D]}),U=C&&Object.entries(C).reduce((K,M)=>{let[G,D]=M;if(D===void 0)return K;return K[G]=D,K},{}),V=H===null||H===void 0?void 0:(X=H.compoundVariants)===null||X===void 0?void 0:X.reduce((K,M)=>{let{class:G,className:D,...T}=M;return Object.entries(T).every((k)=>{let[v,z]=k;return Array.isArray(z)?z.includes({...q,...U}[v]):{...q,...U}[v]===z})?[...K,G,D]:K},[]);return g1(Z,J,V,C===null||C===void 0?void 0:C.class,C===null||C===void 0?void 0:C.className)}};var L1=function(Z){var H,C,X="";if(typeof Z=="string"||typeof Z=="number")X+=Z;else if(typeof Z=="object")if(Array.isArray(Z)){var Y=Z.length;for(H=0;H<Y;H++)Z[H]&&(C=L1(Z[H]))&&(X&&(X+=" "),X+=C)}else for(C in Z)Z[C]&&(X&&(X+=" "),X+=C);return X};function I1(){for(var Z,H,C=0,X="",Y=arguments.length;C<Y;C++)(Z=arguments[C])&&(H=L1(Z))&&(X&&(X+=" "),X+=H);return X}var e1=function(Z){const H=C9(Z),{conflictingClassGroups:C,conflictingClassGroupModifiers:X}=Z;function Y(J){const U=J.split("-");if(U[0]===""&&U.length!==1)U.shift();return P1(U,H)||Z9(J)}function q(J,U){const V=C[J]||[];if(U&&X[J])return[...V,...X[J]];return V}return{getClassGroupId:Y,getConflictingClassGroupIds:q}},P1=function(Z,H){if(Z.length===0)return H.classGroupId;const C=Z[0],X=H.nextPart.get(C),Y=X?P1(Z.slice(1),X):void 0;if(Y)return Y;if(H.validators.length===0)return;const q=Z.join("-");return H.validators.find(({validator:J})=>J(q))?.classGroupId},Z9=function(Z){if(W1.test(Z)){const H=W1.exec(Z)[1],C=H?.substring(0,H.indexOf(":"));if(C)return"arbitrary.."+C}},C9=function(Z){const{theme:H,prefix:C}=Z,X={nextPart:new Map,validators:[]};return X9(Object.entries(Z.classGroups),C).forEach(([q,J])=>{V1(J,X,q,H)}),X},V1=function(Z,H,C,X){Z.forEach((Y)=>{if(typeof Y==="string"){const q=Y===""?H:x1(H,Y);q.classGroupId=C;return}if(typeof Y==="function"){if(H9(Y)){V1(Y(X),H,C,X);return}H.validators.push({validator:Y,classGroupId:C});return}Object.entries(Y).forEach(([q,J])=>{V1(J,x1(H,q),C,X)})})},x1=function(Z,H){let C=Z;return H.split("-").forEach((X)=>{if(!C.nextPart.has(X))C.nextPart.set(X,{nextPart:new Map,validators:[]});C=C.nextPart.get(X)}),C},H9=function(Z){return Z.isThemeGetter},X9=function(Z,H){if(!H)return Z;return Z.map(([C,X])=>{const Y=X.map((q)=>{if(typeof q==="string")return H+q;if(typeof q==="object")return Object.fromEntries(Object.entries(q).map(([J,U])=>[H+J,U]));return q});return[C,Y]})},Y9=function(Z){if(Z<1)return{get:()=>{return},set:()=>{}};let H=0,C=new Map,X=new Map;function Y(q,J){if(C.set(q,J),H++,H>Z)H=0,X=C,C=new Map}return{get(q){let J=C.get(q);if(J!==void 0)return J;if((J=X.get(q))!==void 0)return Y(q,J),J},set(q,J){if(C.has(q))C.set(q,J);else Y(q,J)}}},q9=function(Z){const H=Z.separator,C=H.length===1,X=H[0],Y=H.length;return function q(J){const U=[];let V=0,K=0,M;for(let v=0;v<J.length;v++){let z=J[v];if(V===0){if(z===X&&(C||J.slice(v,v+Y)===H)){U.push(J.slice(K,v)),K=v+Y;continue}if(z==="/"){M=v;continue}}if(z==="[")V++;else if(z==="]")V--}const G=U.length===0?J:J.substring(K),D=G.startsWith(h1),T=D?G.substring(1):G,k=M&&M>K?M-K:void 0;return{modifiers:U,hasImportantModifier:D,baseClassName:T,maybePostfixModifierPosition:k}}},J9=function(Z){if(Z.length<=1)return Z;const H=[];let C=[];return Z.forEach((X)=>{if(X[0]==="[")H.push(...C.sort(),X),C=[];else C.push(X)}),H.push(...C.sort()),H},U9=function(Z){return{cache:Y9(Z.cacheSize),splitModifiers:q9(Z),...e1(Z)}},K9=function(Z,H){const{splitModifiers:C,getClassGroupId:X,getConflictingClassGroupIds:Y}=H,q=new Set;return Z.trim().split(Q9).map((J)=>{const{modifiers:U,hasImportantModifier:V,baseClassName:K,maybePostfixModifierPosition:M}=C(J);let G=X(M?K.substring(0,M):K),D=Boolean(M);if(!G){if(!M)return{isTailwindClass:!1,originalClassName:J};if(G=X(K),!G)return{isTailwindClass:!1,originalClassName:J};D=!1}const T=J9(U).join(":");return{isTailwindClass:!0,modifierId:V?T+h1:T,classGroupId:G,originalClassName:J,hasPostfixModifier:D}}).reverse().filter((J)=>{if(!J.isTailwindClass)return!0;const{modifierId:U,classGroupId:V,hasPostfixModifier:K}=J,M=U+V;if(q.has(M))return!1;return q.add(M),Y(V,K).forEach((G)=>q.add(U+G)),!0}).reverse().map((J)=>J.originalClassName).join(" ")},V9=function(){let Z=0,H,C,X="";while(Z<arguments.length)if(H=arguments[Z++]){if(C=b1(H))X&&(X+=" "),X+=C}return X},b1=function(Z){if(typeof Z==="string")return Z;let H,C="";for(let X=0;X<Z.length;X++)if(Z[X]){if(H=b1(Z[X]))C&&(C+=" "),C+=H}return C},M9=function(Z,...H){let C,X,Y,q=J;function J(V){const K=H.reduce((M,G)=>G(M),Z());return C=U9(K),X=C.cache.get,Y=C.cache.set,q=U,U(V)}function U(V){const K=X(V);if(K)return K;const M=K9(V,C);return Y(V,M),M}return function V(){return q(V9.apply(null,arguments))}},F=function(Z){const H=(C)=>C[Z]||[];return H.isThemeGetter=!0,H},y=function(Z){return I(Z)||F9.has(Z)||z9.test(Z)},g=function(Z){return E(Z,"length",g9)},I=function(Z){return Boolean(Z)&&!Number.isNaN(Number(Z))},e=function(Z){return E(Z,"number",I)},p=function(Z){return Boolean(Z)&&Number.isInteger(Number(Z))},N9=function(Z){return Z.endsWith("%")&&I(Z.slice(0,-1))},Q=function(Z){return E1.test(Z)},j=function(Z){return G9.test(Z)},T9=function(Z){return E(Z,B9,u1)},A9=function(Z){return E(Z,"position",u1)},k9=function(Z){return E(Z,S9,L9)},y9=function(Z){return E(Z,"",j9)},i=function(){return!0},E=function(Z,H,C){const X=E1.exec(Z);if(X){if(X[1])return typeof H==="string"?X[1]===H:H.has(X[1]);return C(X[2])}return!1},g9=function(Z){return O9.test(Z)},u1=function(){return!1},j9=function(Z){return D9.test(Z)},L9=function(Z){return v9.test(Z)},I9=function(){const Z=F("colors"),H=F("spacing"),C=F("blur"),X=F("brightness"),Y=F("borderColor"),q=F("borderRadius"),J=F("borderSpacing"),U=F("borderWidth"),V=F("contrast"),K=F("grayscale"),M=F("hueRotate"),G=F("invert"),D=F("gap"),T=F("gradientColorStops"),k=F("gradientColorStopPositions"),v=F("inset"),z=F("margin"),S=F("opacity"),A=F("padding"),n=F("saturate"),u=F("scale"),_=F("sepia"),d=F("skew"),a=F("space"),l=F("translate"),$=()=>["auto","contain","none"],Z1=()=>["auto","hidden","clip","visible","scroll"],C1=()=>["auto",Q,H],O=()=>[Q,H],O1=()=>["",y,g],c=()=>["auto",I,Q],D1=()=>["bottom","center","left","left-bottom","left-top","right","right-bottom","right-top","top"],t=()=>["solid","dashed","dotted","double","none"],v1=()=>["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity","plus-lighter"],H1=()=>["start","end","center","between","around","evenly","stretch"],w=()=>["","0",Q],N1=()=>["auto","avoid","all","avoid-page","page","left","right","column"],R=()=>[I,e],f=()=>[I,Q];return{cacheSize:500,separator:":",theme:{colors:[i],spacing:[y,g],blur:["none","",j,Q],brightness:R(),borderColor:[Z],borderRadius:["none","","full",j,Q],borderSpacing:O(),borderWidth:O1(),contrast:R(),grayscale:w(),hueRotate:f(),invert:w(),gap:O(),gradientColorStops:[Z],gradientColorStopPositions:[N9,g],inset:C1(),margin:C1(),opacity:R(),padding:O(),saturate:R(),scale:R(),sepia:w(),skew:f(),space:O(),translate:O()},classGroups:{aspect:[{aspect:["auto","square","video",Q]}],container:["container"],columns:[{columns:[j]}],"break-after":[{"break-after":N1()}],"break-before":[{"break-before":N1()}],"break-inside":[{"break-inside":["auto","avoid","avoid-page","avoid-column"]}],"box-decoration":[{"box-decoration":["slice","clone"]}],box:[{box:["border","content"]}],display:["block","inline-block","inline","flex","inline-flex","table","inline-table","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row-group","table-row","flow-root","grid","inline-grid","contents","list-item","hidden"],float:[{float:["right","left","none","start","end"]}],clear:[{clear:["left","right","both","none","start","end"]}],isolation:["isolate","isolation-auto"],"object-fit":[{object:["contain","cover","fill","none","scale-down"]}],"object-position":[{object:[...D1(),Q]}],overflow:[{overflow:Z1()}],"overflow-x":[{"overflow-x":Z1()}],"overflow-y":[{"overflow-y":Z1()}],overscroll:[{overscroll:$()}],"overscroll-x":[{"overscroll-x":$()}],"overscroll-y":[{"overscroll-y":$()}],position:["static","fixed","absolute","relative","sticky"],inset:[{inset:[v]}],"inset-x":[{"inset-x":[v]}],"inset-y":[{"inset-y":[v]}],start:[{start:[v]}],end:[{end:[v]}],top:[{top:[v]}],right:[{right:[v]}],bottom:[{bottom:[v]}],left:[{left:[v]}],visibility:["visible","invisible","collapse"],z:[{z:["auto",p,Q]}],basis:[{basis:C1()}],"flex-direction":[{flex:["row","row-reverse","col","col-reverse"]}],"flex-wrap":[{flex:["wrap","wrap-reverse","nowrap"]}],flex:[{flex:["1","auto","initial","none",Q]}],grow:[{grow:w()}],shrink:[{shrink:w()}],order:[{order:["first","last","none",p,Q]}],"grid-cols":[{"grid-cols":[i]}],"col-start-end":[{col:["auto",{span:["full",p,Q]},Q]}],"col-start":[{"col-start":c()}],"col-end":[{"col-end":c()}],"grid-rows":[{"grid-rows":[i]}],"row-start-end":[{row:["auto",{span:[p,Q]},Q]}],"row-start":[{"row-start":c()}],"row-end":[{"row-end":c()}],"grid-flow":[{"grid-flow":["row","col","dense","row-dense","col-dense"]}],"auto-cols":[{"auto-cols":["auto","min","max","fr",Q]}],"auto-rows":[{"auto-rows":["auto","min","max","fr",Q]}],gap:[{gap:[D]}],"gap-x":[{"gap-x":[D]}],"gap-y":[{"gap-y":[D]}],"justify-content":[{justify:["normal",...H1()]}],"justify-items":[{"justify-items":["start","end","center","stretch"]}],"justify-self":[{"justify-self":["auto","start","end","center","stretch"]}],"align-content":[{content:["normal",...H1(),"baseline"]}],"align-items":[{items:["start","end","center","baseline","stretch"]}],"align-self":[{self:["auto","start","end","center","stretch","baseline"]}],"place-content":[{"place-content":[...H1(),"baseline"]}],"place-items":[{"place-items":["start","end","center","baseline","stretch"]}],"place-self":[{"place-self":["auto","start","end","center","stretch"]}],p:[{p:[A]}],px:[{px:[A]}],py:[{py:[A]}],ps:[{ps:[A]}],pe:[{pe:[A]}],pt:[{pt:[A]}],pr:[{pr:[A]}],pb:[{pb:[A]}],pl:[{pl:[A]}],m:[{m:[z]}],mx:[{mx:[z]}],my:[{my:[z]}],ms:[{ms:[z]}],me:[{me:[z]}],mt:[{mt:[z]}],mr:[{mr:[z]}],mb:[{mb:[z]}],ml:[{ml:[z]}],"space-x":[{"space-x":[a]}],"space-x-reverse":["space-x-reverse"],"space-y":[{"space-y":[a]}],"space-y-reverse":["space-y-reverse"],w:[{w:["auto","min","max","fit","svw","lvw","dvw",Q,H]}],"min-w":[{"min-w":[Q,H,"min","max","fit"]}],"max-w":[{"max-w":[Q,H,"none","full","min","max","fit","prose",{screen:[j]},j]}],h:[{h:[Q,H,"auto","min","max","fit","svh","lvh","dvh"]}],"min-h":[{"min-h":[Q,H,"min","max","fit","svh","lvh","dvh"]}],"max-h":[{"max-h":[Q,H,"min","max","fit","svh","lvh","dvh"]}],size:[{size:[Q,H,"auto","min","max","fit"]}],"font-size":[{text:["base",j,g]}],"font-smoothing":["antialiased","subpixel-antialiased"],"font-style":["italic","not-italic"],"font-weight":[{font:["thin","extralight","light","normal","medium","semibold","bold","extrabold","black",e]}],"font-family":[{font:[i]}],"fvn-normal":["normal-nums"],"fvn-ordinal":["ordinal"],"fvn-slashed-zero":["slashed-zero"],"fvn-figure":["lining-nums","oldstyle-nums"],"fvn-spacing":["proportional-nums","tabular-nums"],"fvn-fraction":["diagonal-fractions","stacked-fractons"],tracking:[{tracking:["tighter","tight","normal","wide","wider","widest",Q]}],"line-clamp":[{"line-clamp":["none",I,e]}],leading:[{leading:["none","tight","snug","normal","relaxed","loose",y,Q]}],"list-image":[{"list-image":["none",Q]}],"list-style-type":[{list:["none","disc","decimal",Q]}],"list-style-position":[{list:["inside","outside"]}],"placeholder-color":[{placeholder:[Z]}],"placeholder-opacity":[{"placeholder-opacity":[S]}],"text-alignment":[{text:["left","center","right","justify","start","end"]}],"text-color":[{text:[Z]}],"text-opacity":[{"text-opacity":[S]}],"text-decoration":["underline","overline","line-through","no-underline"],"text-decoration-style":[{decoration:[...t(),"wavy"]}],"text-decoration-thickness":[{decoration:["auto","from-font",y,g]}],"underline-offset":[{"underline-offset":["auto",y,Q]}],"text-decoration-color":[{decoration:[Z]}],"text-transform":["uppercase","lowercase","capitalize","normal-case"],"text-overflow":["truncate","text-ellipsis","text-clip"],"text-wrap":[{text:["wrap","nowrap","balance","pretty"]}],indent:[{indent:O()}],"vertical-align":[{align:["baseline","top","middle","bottom","text-top","text-bottom","sub","super",Q]}],whitespace:[{whitespace:["normal","nowrap","pre","pre-line","pre-wrap","break-spaces"]}],break:[{break:["normal","words","all","keep"]}],hyphens:[{hyphens:["none","manual","auto"]}],content:[{content:["none",Q]}],"bg-attachment":[{bg:["fixed","local","scroll"]}],"bg-clip":[{"bg-clip":["border","padding","content","text"]}],"bg-opacity":[{"bg-opacity":[S]}],"bg-origin":[{"bg-origin":["border","padding","content"]}],"bg-position":[{bg:[...D1(),A9]}],"bg-repeat":[{bg:["no-repeat",{repeat:["","x","y","round","space"]}]}],"bg-size":[{bg:["auto","cover","contain",T9]}],"bg-image":[{bg:["none",{"gradient-to":["t","tr","r","br","b","bl","l","tl"]},k9]}],"bg-color":[{bg:[Z]}],"gradient-from-pos":[{from:[k]}],"gradient-via-pos":[{via:[k]}],"gradient-to-pos":[{to:[k]}],"gradient-from":[{from:[T]}],"gradient-via":[{via:[T]}],"gradient-to":[{to:[T]}],rounded:[{rounded:[q]}],"rounded-s":[{"rounded-s":[q]}],"rounded-e":[{"rounded-e":[q]}],"rounded-t":[{"rounded-t":[q]}],"rounded-r":[{"rounded-r":[q]}],"rounded-b":[{"rounded-b":[q]}],"rounded-l":[{"rounded-l":[q]}],"rounded-ss":[{"rounded-ss":[q]}],"rounded-se":[{"rounded-se":[q]}],"rounded-ee":[{"rounded-ee":[q]}],"rounded-es":[{"rounded-es":[q]}],"rounded-tl":[{"rounded-tl":[q]}],"rounded-tr":[{"rounded-tr":[q]}],"rounded-br":[{"rounded-br":[q]}],"rounded-bl":[{"rounded-bl":[q]}],"border-w":[{border:[U]}],"border-w-x":[{"border-x":[U]}],"border-w-y":[{"border-y":[U]}],"border-w-s":[{"border-s":[U]}],"border-w-e":[{"border-e":[U]}],"border-w-t":[{"border-t":[U]}],"border-w-r":[{"border-r":[U]}],"border-w-b":[{"border-b":[U]}],"border-w-l":[{"border-l":[U]}],"border-opacity":[{"border-opacity":[S]}],"border-style":[{border:[...t(),"hidden"]}],"divide-x":[{"divide-x":[U]}],"divide-x-reverse":["divide-x-reverse"],"divide-y":[{"divide-y":[U]}],"divide-y-reverse":["divide-y-reverse"],"divide-opacity":[{"divide-opacity":[S]}],"divide-style":[{divide:t()}],"border-color":[{border:[Y]}],"border-color-x":[{"border-x":[Y]}],"border-color-y":[{"border-y":[Y]}],"border-color-t":[{"border-t":[Y]}],"border-color-r":[{"border-r":[Y]}],"border-color-b":[{"border-b":[Y]}],"border-color-l":[{"border-l":[Y]}],"divide-color":[{divide:[Y]}],"outline-style":[{outline:["",...t()]}],"outline-offset":[{"outline-offset":[y,Q]}],"outline-w":[{outline:[y,g]}],"outline-color":[{outline:[Z]}],"ring-w":[{ring:O1()}],"ring-w-inset":["ring-inset"],"ring-color":[{ring:[Z]}],"ring-opacity":[{"ring-opacity":[S]}],"ring-offset-w":[{"ring-offset":[y,g]}],"ring-offset-color":[{"ring-offset":[Z]}],shadow:[{shadow:["","inner","none",j,y9]}],"shadow-color":[{shadow:[i]}],opacity:[{opacity:[S]}],"mix-blend":[{"mix-blend":v1()}],"bg-blend":[{"bg-blend":v1()}],filter:[{filter:["","none"]}],blur:[{blur:[C]}],brightness:[{brightness:[X]}],contrast:[{contrast:[V]}],"drop-shadow":[{"drop-shadow":["","none",j,Q]}],grayscale:[{grayscale:[K]}],"hue-rotate":[{"hue-rotate":[M]}],invert:[{invert:[G]}],saturate:[{saturate:[n]}],sepia:[{sepia:[_]}],"backdrop-filter":[{"backdrop-filter":["","none"]}],"backdrop-blur":[{"backdrop-blur":[C]}],"backdrop-brightness":[{"backdrop-brightness":[X]}],"backdrop-contrast":[{"backdrop-contrast":[V]}],"backdrop-grayscale":[{"backdrop-grayscale":[K]}],"backdrop-hue-rotate":[{"backdrop-hue-rotate":[M]}],"backdrop-invert":[{"backdrop-invert":[G]}],"backdrop-opacity":[{"backdrop-opacity":[S]}],"backdrop-saturate":[{"backdrop-saturate":[n]}],"backdrop-sepia":[{"backdrop-sepia":[_]}],"border-collapse":[{border:["collapse","separate"]}],"border-spacing":[{"border-spacing":[J]}],"border-spacing-x":[{"border-spacing-x":[J]}],"border-spacing-y":[{"border-spacing-y":[J]}],"table-layout":[{table:["auto","fixed"]}],caption:[{caption:["top","bottom"]}],transition:[{transition:["none","all","","colors","opacity","shadow","transform",Q]}],duration:[{duration:f()}],ease:[{ease:["linear","in","out","in-out",Q]}],delay:[{delay:f()}],animate:[{animate:["none","spin","ping","pulse","bounce",Q]}],transform:[{transform:["","gpu","none"]}],scale:[{scale:[u]}],"scale-x":[{"scale-x":[u]}],"scale-y":[{"scale-y":[u]}],rotate:[{rotate:[p,Q]}],"translate-x":[{"translate-x":[l]}],"translate-y":[{"translate-y":[l]}],"skew-x":[{"skew-x":[d]}],"skew-y":[{"skew-y":[d]}],"transform-origin":[{origin:["center","top","top-right","right","bottom-right","bottom","bottom-left","left","top-left",Q]}],accent:[{accent:["auto",Z]}],appearance:[{appearance:["none","auto"]}],cursor:[{cursor:["auto","default","pointer","wait","text","move","help","not-allowed","none","context-menu","progress","cell","crosshair","vertical-text","alias","copy","no-drop","grab","grabbing","all-scroll","col-resize","row-resize","n-resize","e-resize","s-resize","w-resize","ne-resize","nw-resize","se-resize","sw-resize","ew-resize","ns-resize","nesw-resize","nwse-resize","zoom-in","zoom-out",Q]}],"caret-color":[{caret:[Z]}],"pointer-events":[{"pointer-events":["none","auto"]}],resize:[{resize:["none","y","x",""]}],"scroll-behavior":[{scroll:["auto","smooth"]}],"scroll-m":[{"scroll-m":O()}],"scroll-mx":[{"scroll-mx":O()}],"scroll-my":[{"scroll-my":O()}],"scroll-ms":[{"scroll-ms":O()}],"scroll-me":[{"scroll-me":O()}],"scroll-mt":[{"scroll-mt":O()}],"scroll-mr":[{"scroll-mr":O()}],"scroll-mb":[{"scroll-mb":O()}],"scroll-ml":[{"scroll-ml":O()}],"scroll-p":[{"scroll-p":O()}],"scroll-px":[{"scroll-px":O()}],"scroll-py":[{"scroll-py":O()}],"scroll-ps":[{"scroll-ps":O()}],"scroll-pe":[{"scroll-pe":O()}],"scroll-pt":[{"scroll-pt":O()}],"scroll-pr":[{"scroll-pr":O()}],"scroll-pb":[{"scroll-pb":O()}],"scroll-pl":[{"scroll-pl":O()}],"snap-align":[{snap:["start","end","center","align-none"]}],"snap-stop":[{snap:["normal","always"]}],"snap-type":[{snap:["none","x","y","both"]}],"snap-strictness":[{snap:["mandatory","proximity"]}],touch:[{touch:["auto","none","manipulation"]}],"touch-x":[{"touch-pan":["x","left","right"]}],"touch-y":[{"touch-pan":["y","up","down"]}],"touch-pz":["touch-pinch-zoom"],select:[{select:["none","text","all","auto"]}],"will-change":[{"will-change":["auto","scroll","contents","transform",Q]}],fill:[{fill:[Z,"none"]}],"stroke-w":[{stroke:[y,g,e]}],stroke:[{stroke:[Z,"none"]}],sr:["sr-only","not-sr-only"],"forced-color-adjust":[{"forced-color-adjust":["auto","none"]}]},conflictingClassGroups:{overflow:["overflow-x","overflow-y"],overscroll:["overscroll-x","overscroll-y"],inset:["inset-x","inset-y","start","end","top","right","bottom","left"],"inset-x":["right","left"],"inset-y":["top","bottom"],flex:["basis","grow","shrink"],gap:["gap-x","gap-y"],p:["px","py","ps","pe","pt","pr","pb","pl"],px:["pr","pl"],py:["pt","pb"],m:["mx","my","ms","me","mt","mr","mb","ml"],mx:["mr","ml"],my:["mt","mb"],size:["w","h"],"font-size":["leading"],"fvn-normal":["fvn-ordinal","fvn-slashed-zero","fvn-figure","fvn-spacing","fvn-fraction"],"fvn-ordinal":["fvn-normal"],"fvn-slashed-zero":["fvn-normal"],"fvn-figure":["fvn-normal"],"fvn-spacing":["fvn-normal"],"fvn-fraction":["fvn-normal"],"line-clamp":["display","overflow"],rounded:["rounded-s","rounded-e","rounded-t","rounded-r","rounded-b","rounded-l","rounded-ss","rounded-se","rounded-ee","rounded-es","rounded-tl","rounded-tr","rounded-br","rounded-bl"],"rounded-s":["rounded-ss","rounded-es"],"rounded-e":["rounded-se","rounded-ee"],"rounded-t":["rounded-tl","rounded-tr"],"rounded-r":["rounded-tr","rounded-br"],"rounded-b":["rounded-br","rounded-bl"],"rounded-l":["rounded-tl","rounded-bl"],"border-spacing":["border-spacing-x","border-spacing-y"],"border-w":["border-w-s","border-w-e","border-w-t","border-w-r","border-w-b","border-w-l"],"border-w-x":["border-w-r","border-w-l"],"border-w-y":["border-w-t","border-w-b"],"border-color":["border-color-t","border-color-r","border-color-b","border-color-l"],"border-color-x":["border-color-r","border-color-l"],"border-color-y":["border-color-t","border-color-b"],"scroll-m":["scroll-mx","scroll-my","scroll-ms","scroll-me","scroll-mt","scroll-mr","scroll-mb","scroll-ml"],"scroll-mx":["scroll-mr","scroll-ml"],"scroll-my":["scroll-mt","scroll-mb"],"scroll-p":["scroll-px","scroll-py","scroll-ps","scroll-pe","scroll-pt","scroll-pr","scroll-pb","scroll-pl"],"scroll-px":["scroll-pr","scroll-pl"],"scroll-py":["scroll-pt","scroll-pb"],touch:["touch-x","touch-y","touch-pz"],"touch-x":["touch"],"touch-y":["touch"],"touch-pz":["touch"]},conflictingClassGroupModifiers:{"font-size":["leading"]}}};var W1=/^\[(.+)\]$/,h1="!",Q9=/\s+/,E1=/^\[(?:([a-z-]+):)?(.+)\]$/i,z9=/^\d+\/\d+$/,F9=new Set(["px","full","screen"]),G9=/^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,O9=/\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,D9=/^-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,v9=/^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,B9=new Set(["length","size","percentage"]),S9=new Set(["image","url"]);var $1=M9(I9);function w1(...Z){return $1(I1(Z))}import{jsxDEV as x9} from"react/jsx-dev-runtime";var W9=j1("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",{variants:{variant:{default:"bg-primary text-primary-foreground shadow hover:bg-primary/90",destructive:"bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",outline:"border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",secondary:"bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",ghost:"hover:bg-accent hover:text-accent-foreground",link:"text-primary underline-offset-4 hover:underline"},size:{default:"h-9 px-4 py-2",sm:"h-8 rounded-md px-3 text-xs",lg:"h-10 rounded-md px-8",icon:"h-9 w-9"}},defaultVariants:{variant:"default",size:"default"}}),M1=R1.forwardRef(({className:Z,variant:H,size:C,asChild:X=!1,...Y},q)=>{return x9(X?K1:"button",{className:w1(W9({variant:H,size:C,className:Z})),ref:q,...Y},void 0,!1,void 0,this)});M1.displayName="Button";import{forwardRef as W,createElement as B} from"react";var x=function(Z,H){if(Z==null)return{};var C={},X=Object.keys(Z),Y,q;for(q=0;q<X.length;q++){if(Y=X[q],H.indexOf(Y)>=0)continue;C[Y]=Z[Y]}return C};var P9=["color"],m1=W(function(Z,H){var C=Z.color,X=C===void 0?"currentColor":C,Y=x(Z,P9);return B("svg",Object.assign({width:"15",height:"15",viewBox:"0 0 15 15",fill:"none",xmlns:"http://www.w3.org/2000/svg"},Y,{ref:H}),B("path",{d:"M3.35355 1.85355C3.54882 1.65829 3.54882 1.34171 3.35355 1.14645C3.15829 0.951184 2.84171 0.951184 2.64645 1.14645L0.646447 3.14645C0.451184 3.34171 0.451184 3.65829 0.646447 3.85355L2.64645 5.85355C2.84171 6.04882 3.15829 6.04882 3.35355 5.85355C3.54882 5.65829 3.54882 5.34171 3.35355 5.14645L2.20711 4H9.5C11.433 4 13 5.567 13 7.5C13 7.77614 13.2239 8 13.5 8C13.7761 8 14 7.77614 14 7.5C14 5.01472 11.9853 3 9.5 3H2.20711L3.35355 1.85355ZM2 7.5C2 7.22386 1.77614 7 1.5 7C1.22386 7 1 7.22386 1 7.5C1 9.98528 3.01472 12 5.5 12H12.7929L11.6464 13.1464C11.4512 13.3417 11.4512 13.6583 11.6464 13.8536C11.8417 14.0488 12.1583 14.0488 12.3536 13.8536L14.3536 11.8536C14.5488 11.6583 14.5488 11.3417 14.3536 11.1464L12.3536 9.14645C12.1583 8.95118 11.8417 8.95118 11.6464 9.14645C11.4512 9.34171 11.4512 9.65829 11.6464 9.85355L12.7929 11H5.5C3.567 11 2 9.433 2 7.5Z",fill:X,fillRule:"evenodd",clipRule:"evenodd"}))});var h9=["color"],p1=W(function(Z,H){var C=Z.color,X=C===void 0?"currentColor":C,Y=x(Z,h9);return B("svg",Object.assign({width:"15",height:"15",viewBox:"0 0 15 15",fill:"none",xmlns:"http://www.w3.org/2000/svg"},Y,{ref:H}),B("path",{d:"M6.04995 2.74998C6.04995 2.44623 5.80371 2.19998 5.49995 2.19998C5.19619 2.19998 4.94995 2.44623 4.94995 2.74998V12.25C4.94995 12.5537 5.19619 12.8 5.49995 12.8C5.80371 12.8 6.04995 12.5537 6.04995 12.25V2.74998ZM10.05 2.74998C10.05 2.44623 9.80371 2.19998 9.49995 2.19998C9.19619 2.19998 8.94995 2.44623 8.94995 2.74998V12.25C8.94995 12.5537 9.19619 12.8 9.49995 12.8C9.80371 12.8 10.05 12.5537 10.05 12.25V2.74998Z",fill:X,fillRule:"evenodd",clipRule:"evenodd"}))});var b9=["color"],i1=W(function(Z,H){var C=Z.color,X=C===void 0?"currentColor":C,Y=x(Z,b9);return B("svg",Object.assign({width:"15",height:"15",viewBox:"0 0 15 15",fill:"none",xmlns:"http://www.w3.org/2000/svg"},Y,{ref:H}),B("path",{d:"M3.24182 2.32181C3.3919 2.23132 3.5784 2.22601 3.73338 2.30781L12.7334 7.05781C12.8974 7.14436 13 7.31457 13 7.5C13 7.68543 12.8974 7.85564 12.7334 7.94219L3.73338 12.6922C3.5784 12.774 3.3919 12.7687 3.24182 12.6782C3.09175 12.5877 3 12.4252 3 12.25V2.75C3 2.57476 3.09175 2.4123 3.24182 2.32181ZM4 3.57925V11.4207L11.4288 7.5L4 3.57925Z",fill:X,fillRule:"evenodd",clipRule:"evenodd"}))});var E9=["color"],s1=W(function(Z,H){var C=Z.color,X=C===void 0?"currentColor":C,Y=x(Z,E9);return B("svg",Object.assign({width:"15",height:"15",viewBox:"0 0 15 15",fill:"none",xmlns:"http://www.w3.org/2000/svg"},Y,{ref:H}),B("path",{d:"M7.46968 1.05085C7.64122 1.13475 7.75 1.30904 7.75 1.5V13.5C7.75 13.691 7.64122 13.8653 7.46968 13.9492C7.29813 14.0331 7.09377 14.0119 6.94303 13.8947L3.2213 11H1.5C0.671571 11 0 10.3284 0 9.5V5.5C0 4.67158 0.671573 4 1.5 4H3.2213L6.94303 1.10533C7.09377 0.988085 7.29813 0.966945 7.46968 1.05085ZM6.75 2.52232L3.69983 4.89468C3.61206 4.96294 3.50405 5 3.39286 5H1.5C1.22386 5 1 5.22386 1 5.5V9.5C1 9.77615 1.22386 10 1.5 10H3.39286C3.50405 10 3.61206 10.0371 3.69983 10.1053L6.75 12.4777V2.52232ZM10.2784 3.84804C10.4623 3.72567 10.7106 3.77557 10.833 3.95949C12.2558 6.09798 12.2558 8.90199 10.833 11.0405C10.7106 11.2244 10.4623 11.2743 10.2784 11.1519C10.0944 11.0296 10.0445 10.7813 10.1669 10.5973C11.4111 8.72728 11.4111 6.27269 10.1669 4.40264C10.0445 4.21871 10.0944 3.97041 10.2784 3.84804ZM12.6785 1.43044C12.5356 1.2619 12.2832 1.24104 12.1147 1.38386C11.9462 1.52667 11.9253 1.77908 12.0681 1.94762C14.7773 5.14488 14.7773 9.85513 12.0681 13.0524C11.9253 13.2209 11.9462 13.4733 12.1147 13.6161C12.2832 13.759 12.5356 13.7381 12.6785 13.5696C15.6406 10.0739 15.6406 4.92612 12.6785 1.43044Z",fill:X,fillRule:"evenodd",clipRule:"evenodd"}))});var u9=["color"],n1=W(function(Z,H){var C=Z.color,X=C===void 0?"currentColor":C,Y=x(Z,u9);return B("svg",Object.assign({width:"15",height:"15",viewBox:"0 0 15 15",fill:"none",xmlns:"http://www.w3.org/2000/svg"},Y,{ref:H}),B("path",{d:"M7.72361 1.05279C7.893 1.13749 8 1.31062 8 1.5V13.5C8 13.6894 7.893 13.8625 7.72361 13.9472C7.55421 14.0319 7.35151 14.0136 7.2 13.9L3.33333 11H1.5C0.671573 11 0 10.3284 0 9.5V5.5C0 4.67158 0.671573 4 1.5 4H3.33333L7.2 1.1C7.35151 0.986371 7.55421 0.968093 7.72361 1.05279ZM7 2.5L3.8 4.9C3.71345 4.96491 3.60819 5 3.5 5H1.5C1.22386 5 1 5.22386 1 5.5V9.5C1 9.77614 1.22386 10 1.5 10H3.5C3.60819 10 3.71345 10.0351 3.8 10.1L7 12.5V2.5ZM14.8536 5.14645C15.0488 5.34171 15.0488 5.65829 14.8536 5.85355L13.2071 7.5L14.8536 9.14645C15.0488 9.34171 15.0488 9.65829 14.8536 9.85355C14.6583 10.0488 14.3417 10.0488 14.1464 9.85355L12.5 8.20711L10.8536 9.85355C10.6583 10.0488 10.3417 10.0488 10.1464 9.85355C9.95118 9.65829 9.95118 9.34171 10.1464 9.14645L11.7929 7.5L10.1464 5.85355C9.95118 5.65829 9.95118 5.34171 10.1464 5.14645C10.3417 4.95118 10.6583 4.95118 10.8536 5.14645L12.5 6.79289L14.1464 5.14645C14.3417 4.95118 14.6583 4.95118 14.8536 5.14645Z",fill:X,fillRule:"evenodd",clipRule:"evenodd"}))});var $9=["color"],_1=W(function(Z,H){var C=Z.color,X=C===void 0?"currentColor":C,Y=x(Z,$9);return B("svg",Object.assign({width:"15",height:"15",viewBox:"0 0 15 15",fill:"none",xmlns:"http://www.w3.org/2000/svg"},Y,{ref:H}),B("path",{d:"M13.0502 2.74989C13.0502 2.44613 12.804 2.19989 12.5002 2.19989C12.1965 2.19989 11.9502 2.44613 11.9502 2.74989V7.2825C11.9046 7.18802 11.8295 7.10851 11.7334 7.05776L2.73338 2.30776C2.5784 2.22596 2.3919 2.23127 2.24182 2.32176C2.09175 2.41225 2 2.57471 2 2.74995V12.25C2 12.4252 2.09175 12.5877 2.24182 12.6781C2.3919 12.7686 2.5784 12.7739 2.73338 12.6921L11.7334 7.94214C11.8295 7.89139 11.9046 7.81188 11.9502 7.7174V12.2499C11.9502 12.5536 12.1965 12.7999 12.5002 12.7999C12.804 12.7999 13.0502 12.5536 13.0502 12.2499V2.74989ZM3 11.4207V3.5792L10.4288 7.49995L3 11.4207Z",fill:X,fillRule:"evenodd",clipRule:"evenodd"}))}),w9=["color"],d1=W(function(Z,H){var C=Z.color,X=C===void 0?"currentColor":C,Y=x(Z,w9);return B("svg",Object.assign({width:"15",height:"15",viewBox:"0 0 15 15",fill:"none",xmlns:"http://www.w3.org/2000/svg"},Y,{ref:H}),B("path",{d:"M1.94976 2.74989C1.94976 2.44613 2.196 2.19989 2.49976 2.19989C2.80351 2.19989 3.04976 2.44613 3.04976 2.74989V7.2825C3.0954 7.18802 3.17046 7.10851 3.26662 7.05776L12.2666 2.30776C12.4216 2.22596 12.6081 2.23127 12.7582 2.32176C12.9083 2.41225 13 2.57471 13 2.74995V12.25C13 12.4252 12.9083 12.5877 12.7582 12.6781C12.6081 12.7686 12.4216 12.7739 12.2666 12.6921L3.26662 7.94214C3.17046 7.89139 3.0954 7.81188 3.04976 7.7174V12.2499C3.04976 12.5536 2.80351 12.7999 2.49976 12.7999C2.196 12.7999 1.94976 12.5536 1.94976 12.2499V2.74989ZM4.57122 7.49995L12 11.4207V3.5792L4.57122 7.49995Z",fill:X,fillRule:"evenodd",clipRule:"evenodd"}))});var s=function({children:Z,onClick:H,label:C}){return N(M1,{onClick:H,className:"w-10 h-10 border border-neutral-900 rounded-sm transition dark:hover:bg-neutral-900/30 dark:hover:border-neutral-900/70 dark:hover:text-green-500",variant:"ghost",size:"icon","data-label":C,children:Z},void 0,!1,void 0,this)};import{jsxDEV as N} from"react/jsx-dev-runtime";function z1({track:Z,trackDuration:H,currentTime:C,isPlaying:X,isLooping:Y,isMuted:q,play:J,pause:U,previous:V,next:K,mute:M,audioRef:G,progressBarRef:D}){return N("div",{className:"track-controls w-full flex flex-col md:flex-row gap-2 items-center justify-between",children:[N("div",{className:"track-control-buttons w-full md:w-fit flex flex-row items-center justify-between md:gap-2",children:[N("div",{className:"flex",children:N(s,{label:"loop",onClick:()=>{console.log("loopin'")},children:N(m1,{className:"w-5 h-5"},void 0,!1,void 0,this)},void 0,!1,void 0,this)},void 0,!1,void 0,this),N("div",{className:"flex flex-row gap-2",children:[N(s,{label:"previous",onClick:V,children:N(d1,{className:"w-5 h-5"},void 0,!1,void 0,this)},void 0,!1,void 0,this),N(s,{label:X?"pause":"play",onClick:X?U:J,children:X?N(p1,{className:"w-6 h-6"},void 0,!1,void 0,this):N(i1,{className:"w-6 h-6"},void 0,!1,void 0,this)},void 0,!1,void 0,this),N(s,{label:"next",onClick:K,children:N(_1,{className:"w-5 h-5"},void 0,!1,void 0,this)},void 0,!1,void 0,this)]},void 0,!0,void 0,this),N("div",{className:"flex",children:N(s,{label:"mute",onClick:M,children:q?N(n1,{className:"w-5 h-5"},void 0,!1,void 0,this):N(s1,{className:"w-5 h-5"},void 0,!1,void 0,this)},void 0,!1,void 0,this)},void 0,!1,void 0,this)]},void 0,!0,void 0,this),N(J1,{trackDuration:H,currentTime:C,audioRef:G,progressBarRef:D},void 0,!1,void 0,this)]},void 0,!0,void 0,this)}import{jsxDEV as h} from"react/jsx-dev-runtime";function G1({id:Z,playlist:H}){const[C,X]=P(H[0]),[Y,q]=P(0),[J,U]=P(0),[V,K]=P(!1),[M,G]=P(!0),[D,T]=P(!1),[k,v]=P(1),z=F1(null),S=F1(null),A=F1(null);R9(()=>{if(!A.current)console.log("[WavePlayer] Creating AudioContext..."),A.current=new AudioContext;if(!z.current)return;q(z.current.duration)},[]);function n(){if(console.log("[WavePlayer] onLoadedMetadata called."),!z.current)return;q(z.current.duration)}function u(){if(console.log("[WavePlayer] onTimeUpdate called."),!z.current||J===z.current.currentTime)return;U(z.current.currentTime)}function _(){if(console.log("[WavePlayer] playTrack called."),!z.current)return;z.current.play(),K(!0)}function d(){if(console.log("[WavePlayer] pauseTrack called."),!z.current)return;z.current.pause(),K(!1)}function a(){if(console.log("[WavePlayer] previousTrack called."),H.indexOf(C)>0)X(H[H.indexOf(C)-1]);else X(H[H.length-1])}function l(){if(console.log("[WavePlayer] nextTrack called."),H.indexOf(C)<H.length-1)X(H[H.indexOf(C)+1]);else X(H[0])}function $(){console.log("[WavePlayer] toggleMute called."),T(!D)}return h("div",{className:"wave-player w-fit md:w-full md:max-w-3xl p-2 flex flex-col gap-2 md:flex-row border border-neutral-900 rounded-sm","data-testid":"wave-player",children:[h("audio",{ref:z,src:C.src,muted:D,loop:M,defaultValue:C.src,onLoadedMetadata:n,onTimeUpdate:u,crossOrigin:"anonymous",preload:"metadata"},void 0,!1,void 0,this),h("div",{className:"flex",children:h(Y1,{image:void 0},void 0,!1,void 0,this)},void 0,!1,void 0,this),h("div",{className:"w-full flex flex-col gap-2 justify-between",children:[h(q1,{track:C},void 0,!1,void 0,this),h(z1,{track:C,trackDuration:Y,currentTime:J,isPlaying:V,isLooping:M,isMuted:D,play:_,pause:d,previous:a,next:l,mute:$,audioRef:z,progressBarRef:S},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}var I0=G1;export{I0 as default};