"use strict";

function wait(time){
  return new Promise(function(resolve, reject){
    window.setTimeout(() => resolve(), time);
  });
}

function randomOf(a){
  return a[Math.floor(Math.random() * a.length)];
}

Array.prototype.indexTest = function(test){
  for (let i = 0; i < this.length; i++){
    if (test(this[i])) return i;
  }
  return -1;
};

function tweenAdjust(base, diff, speed){
  if (Math.abs(diff) > speed){
    return base + (speed * Math.sign(diff));
  } else {
    return base + diff;
  }
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

const beep = (function(){
  if (window.AudioContext){
    const audio = window.AudioContext ? new AudioContext() : null;
    const gainNode = audio.createGain();
    gainNode.gain.value = 0.5;
    gainNode.connect(audio.destination);

    return function(){
      const oscillator = audio.createOscillator();
      oscillator.frequency.setValueAtTime(880, audio.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(1046.5, audio.currentTime + 0.05)
      oscillator.connect(gainNode);
      oscillator.start();

      return wait(100).then(() => oscillator.stop());
    };
  } else {
    return () => new Promise((resolve, reject) => resolve());
  }
})();

function asElement(source){
  if (source instanceof HTMLElement){
    return source;
  } else if (typeof(source) === 'string'){
    return document.querySelector(source);
  } else {
    return null;
  }
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
    return getPosition(asElement(source));
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

  this.inContainer = false;

  this.getPosition = function(){ return getPosition(this.element); }

  this.moveTo = function(position){
    position = getPosition(position);
    const myBounds = this.element.getBoundingClientRect();

    //console.log('move %o from %o to %o', this.element, myBounds, position);

    this.element.style.left = (position.x - (myBounds.width / 2)) + 'px';
    this.element.style.top = (position.y - (myBounds.height / 2)) + 'px';
  };

  this.tweenTo = function(position, speed){
    const container = asElement(position);
    position = getPosition(position);
    const myPosition = getPosition(this.element);
    speed = speed || 10;

    this.exitContainer();

    return new Promise((resolve, reject) => {
      if (speed <= 0 || !position){
        reject();
        return;
      }

      //console.log('tween %o from %o to %o', this.element, myPosition, position);

      const tnext = () => {
        const dX = position.x - myPosition.x;
        const dY = position.y - myPosition.y;

        if (Math.abs(dX) > speed || Math.abs(dY) > speed){
          myPosition.x = tweenAdjust(myPosition.x, dX, speed);
          myPosition.y = tweenAdjust(myPosition.y, dY, speed);
          this.moveTo(myPosition);

          window.setTimeout(tnext, 50);
        } else {
          if (container && container.classList.contains('emoji-container')) this.enterContainer(container);
          resolve();
        }
      };
      tnext();
    });
  };

  this.enterContainer = function(container){
    container = container instanceof HTMLElement ? container : document.querySelector(container);

    this.clear();
    container.appendChild(this.element);
    this.inContainer = true;
  };

  this.exitContainer = function(){
    this.clear();
    document.body.appendChild(this.element);
    this.inContainer = false;
  };

  this.clear = function(){
    if (this.element.parentElement){
      this.element.parentElement.removeChild(this.element);
    }
  }
}

window.onload = async function(){
  let score = 0;
  await wait(600);

  // create pumkin
  const pumkin = new emojiActor(0x1F383, 'pumkin');
  pumkin.moveTo('#door');
  await speak("I'm very hungry!");
  await pumkin.tweenTo('#pumkin-area');

  // create food areas
  const foodStatus = [null, null, null, null];
  const foodActors = [null, null, null, null];
  const foodContainers = [null, null, null, null];

  const foodChoiceHandler = (function(){
    let handler = null;
    function onClick(e){
      if (handler){
        handler(+this.getAttribute('data-value'));
      }
    }

    function getChoice(){
      return new Promise(function (resolve, reject){
        handler = resolve;
      });
    }

    return { onClick, getChoice };
  })();

  for (let i = 0; i < 4; i++){
    foodContainers[i] = document.createElement('div');
    foodContainers[i].className = 'food-container emoji-container';
    foodContainers[i].setAttribute('data-value', i);
    foodContainers[i].onclick = foodChoiceHandler.onClick;
    document.getElementById('food-area').appendChild(foodContainers[i]);
  }

  function populateFood(){
    let i;
    const r = [];
    const foodArea = document.getElementById('food-area');

    while ((i = foodStatus.indexTest(f => !f)) != -1){
      if (foodActors[i]) foodActors[i].clear();

      while (true){
        let newFood = randomOf(food);
        if (foodStatus.indexTest(f => f && f[0] === newFood[0]) === -1){
          foodStatus[i] = newFood;
          foodActors[i] = new emojiActor(newFood[0], 'food');

          const p = getPosition(foodContainers[i]);
          p.y += foodArea.offsetHeight;
          foodActors[i].moveTo(p);
          r.push(foodActors[i].tweenTo(foodContainers[i]));
          break;
        }
      }
    }
    return Promise.all(r);
  }

  async function gameTurn(){
    let choices = [];

    for (let i = 0; i < 4; i++){
      if (foodStatus[i]){
        choices.push(i);
      }
    }

    if (choices.length === 0){
      await populateFood();
      choices = [0, 1, 2, 3];
    }

    console.log("Choices: %o", choices);
    const correctChoice = randomOf(choices);
    console.log("Correct choice: %o (%o)", correctChoice, foodStatus[correctChoice]);

    const afa = document.getElementById('active-food-area');

    await speak("Give me the " + foodStatus[correctChoice][1]);
    const playerChoice = await foodChoiceHandler.getChoice();

    await foodActors[playerChoice].tweenTo(afa);
    if (playerChoice === correctChoice){

      await speak("Nom nom");

      foodStatus[correctChoice] = null;
      foodActors[correctChoice].clear();
      score++;
      document.getElementById('score').textContent = score;
      await beep();

      gameTurn();
    } else {
      const offScreen = getPosition(afa);
      offScreen.x = document.body.offsetWidth + afa.offsetWidth;

      await Promise.all([
        speak("No, I don't want that!"),
        foodActors[playerChoice].tweenTo(offScreen, 30)
      ]);

      foodActors[playerChoice].clear();
      foodStatus[playerChoice] = null;
      gameTurn();
    }

    window.getSelection().removeAllRanges();
  }

  gameTurn();
};
