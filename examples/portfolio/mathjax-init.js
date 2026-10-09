RPGM.on('didEnterStep', (id)=>{
    setTimeout(()=>{
        MathJax.typeset();
    }, 200);
});

RPGM.on('didReceiveMessage', (message, rData)=>{
    if(message === 'refreshMathjax'){
        MathJax.typeset();
    }
});
