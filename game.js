"use strict";

function wait(time){
  return new Promise(function(resolve, reject){
    window.setTimeout(() => resolve(), time);
  });
}

function speak(text){
  return new Promise(function(resolve, reject) {
    if (window.speechSynthesis && SpeechSynthesisUtterance){
      const u = new SpeechSynthesisUtterance(text);
      u.onend = () => resolve();
      window.speechSynthesis.speak(u);
    } else {
      reject();
    }
  });
}

function getPosition(source){
  if (!source){
    return null;
  } else if (source instanceof HTMLElement){
    const rect = source.getBoundingClientRect();
    return { x: rect.x + (rect.width / 2), y: rect.y + (rect.height / 2) };
  } else if (source instanceof emojiActor){
    return getPosition(source.element);
  } else if (typeof(source) === 'string') {
    return getPosition(document.querySelector(source));
  } else if (source.x && source.y){
    return source;
  } else {
    return null;
  }
}

function emojiActor(emoji, className){
  this.element = (function(){
    var b = document.createElement('b');
    b.textContent = String.fromCodePoint(emoji);
    b.className = 'emojiActor ' + (className || '');
    document.body.appendChild(b);
    return b;
  })();

  this.getPosition = function(){ return getPosition(this.element); }

  this.moveTo = function(position){
    position = getPosition(position);
    const myBounds = this.element.getBoundingClientRect();

    this.element.style.left = (position.x - (myBounds.width / 2)) + 'px';
    this.element.style.top = (position.y - (myBounds.height / 2)) + 'px';
  };
}

window.onload = async function(){
  await wait(1000);

  // create pumkin
  const pumkin = new emojiActor(0x1F383, 'pumkin');
  pumkin.moveTo('#door');
  await speak("I'm very hungry!");
};
