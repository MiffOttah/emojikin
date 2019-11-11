"use strict";

const fs = require('fs');

const food = [];
fs.readFile('food_raw.txt', (error, foodData) => {
  if (error){
    console.error(error);
    return;
  }

  foodData = ('' + foodData).split('\n');

  for (let fd of foodData){
    fd = fd.trim();
    let ix = fd.indexOf(' ');
    if (ix !== -1){
      food.push([fd.codePointAt(0), fd.substr(ix + 1)]);
    }
  }

  const output = 'const food = ' + JSON.stringify(food) + ';\n';
  fs.writeFile('../food.js', output, err => err ? console.error(err) : void 0);
});
