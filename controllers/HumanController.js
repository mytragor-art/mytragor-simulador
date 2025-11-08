(function(){
  function HumanController(side){
    this.side=side;
    this._onClick=this._onClick.bind(this);
  }
  HumanController.prototype.onAttach=function(){
    document.addEventListener('click',this._onClick);
  };
  HumanController.prototype.onDetach=function(){
    document.removeEventListener('click',this._onClick);
  };
  HumanController.prototype._onClick=function(e){
    const el=e.target.closest('[data-card-id]');
    if(!el) return;
    const cardId=el.dataset.cardId;
    Dispatcher.apply({kind:'PLAY_CARD',cardId,from:'hand',to:'board'});
  };
  HumanController.prototype.onEvent=function(evt){};
  HumanController.prototype.dispose=function(){this.onDetach();};
  window.HumanController=HumanController;
})();