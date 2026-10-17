function r(n){if(n==null)return'""';let t=String(n);return/^[=+\-@\t\r]/.test(t)&&(t=`'${t}`),`"${t.replace(/"/g,'""')}"`}function i(n){return"\uFEFF"+n.map(t=>t.map(r).join(",")).join(`\r
`)}export{r as s,i as t};
