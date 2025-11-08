(function(){
  function AIController(side){this.side=side;this._t=null;}
  AIController.prototype.onAttach=function(){};
  AIController.prototype.onEvent=function(evt){
    if(evt.type==='TURN_START'&&evt.side===this.side){this._loop();}
  };
  AIController.prototype._loop=function(){
    clearTimeout(this._t);
    const state=Game.viewFor?Game.viewFor(this.side):{};
    const action=(window.AIBrain&&AIBrain.next)?AIBrain.next(state):null;
    if(action){
      this._t=setTimeout(()=>{Dispatcher.apply(action);this._loop();},350);
    } else {
      this._t=setTimeout(()=>Dispatcher.apply({kind:'END_TURN'}),250);
    }
  };
  AIController.prototype.dispose=function(){clearTimeout(this._t);};
  window.AIController=AIController;
})();