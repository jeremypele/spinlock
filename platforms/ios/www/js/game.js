$(function(){
    "use strict";

    // GLOBALS
    var circles_array = [],
        refresh_interval_id,
        timer_interval,
        colors = [ '#FE6203', '#ECC306', '#F87E59', '#F4B174', '#C0B0A3'];

    // Persistance trough localStorage
    function storageService() {
      var self = {},
          localStorage = window.localStorage,
          sessionStorage = window.sessionStorage;

      // Checks the browser to see if local storage is supported
      var browserSupportsLocalStorage = function() {
        try {
          return ('localStorage' in window && window['localStorage'] !== null);
        } catch (e) {
          return false;
        }
      };

      // Directly adds a value to local storage
      self.add = function(key, value) {
        if (!browserSupportsLocalStorage())
          return false;

        // Let's convert undefined values to null to get the value consistent
        if (typeof value == "undefined") value = null;

        try {
          if (typeof value === 'object')
            value = JSON.stringify(value);

          localStorage.setItem(key, value);
        } catch (e) {}
        return true;
      };

      // Directly get a value from local storage
      self.get = function(key) {
        if (!browserSupportsLocalStorage())
          return false;

        var item = localStorage.getItem(key);
        if (!item || item === 'null') return null;

        if (item.charAt(0) === "{" || item.charAt(0) === "[")
          return JSON.parse(item);

        return item;
      };

      // Remove an item from local storage
      self.remove = function(key) {
        if (!browserSupportsLocalStorage())
          return false;

        try {
          localStorage.removeItem(key);
        } catch (e) {}
        return true;
      };

      // Return array of keys for local storage
      self.getKeys = function() {
        if (!browserSupportsLocalStorage()) return false;

        var keys = [];
        for (var key in localStorage) {
          keys.push(key);
        }
        return keys;
      };

      // Remove all data for this app from local storage
      self.clearAll = function() {

        if (!browserSupportsLocalStorage())
          return false;

        for (var key in localStorage) {
          try {
            removeFromLocalStorage(key);
          } catch (e) {}
        }
        return true;
      };

      return self;
    };
    var storage = storageService();

    /*
     * Game
     */
    function spinLock() {}

    var canvas = document.getElementById("spinlocker"),
        context = canvas.getContext("2d"),ctx,
        data = { canvas: canvas, context: context };

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * .6;

    spinLock = {
      isPaused: false,
      timer: new Date(),
      secondsToPlay: 60,
      interval: 20,
      levels: {
        1: {
          add_circles: 0,
          max_speed: 3,
          openingMalus: 0
        },
        3: {
          add_circles: 1,
          max_speed: 4,
          openingMalus: 1
        },
        4: {
          add_circles: 2,
          max_speed: 4,
          openingMalus: 1
        },
        5: {
          add_circles: 3,
          max_speed: 5,
          openingMalus: 1
        },
        21: {
          add_circles: 4,
          max_speed: 5,
          openingMalus: 1
        }
      },
      currentLevel: 1,
      levelParams : {},
      init: function(level){
        if (!level) level = 1;

        $("#game-screen").show();
        //  > Niveau 1 : 3 cercles, facile / basique (vitesse moyenne basique et taille de l'opening de base) 
        //  > Niveau 2 : 4 cercles, vitesse moyenne +2%, opening -1%
        //  > Niveau 3 : 4 cercles, vitesse moyenne +2% opening -1%
        //  > Niveau 4 : 5 cercles, vitesse moyenne + 2% opening -1%
        //  > Niveau 5 - 10 : 5 cercles, 1 piège aléatoire, vitesse moyenne +2%, opening -1%
        //  > Niveau 11-20 : 5 cercles, 2 pièges aléatoires, vitesse moyenne +2%, opening -1%
        //  > Niveau 21 - infini : vitesse et opening stabilisés. 2 pièges / niveau.


        // 
        console.log("LEVEL => ", level);

        if (spinLock.levels[level])
          spinLock.levelParams = spinLock.levels[level];

        var number_of_circles = Math.floor(spinLock.levelParams.add_circles + 3);
        
        circles_array = toolBox.createCircles(number_of_circles);
        spinLock.setCountDown(5);
        refresh_interval_id = setInterval(spinLock.draw, spinLock.interval);
 
        spinLock.setTimer(true);
        timer_interval = setInterval(spinLock.setTimer, 1000);
      },
      setCountDown: function(try_left){
        $("#countdown").html(try_left + (try_left > 1 ? " essais" : " essai"));

        if (try_left < 1) {
          $(document).trigger("game.gameover");
          return ;
        }
      },
      setTimer: function(doInit){
        if (spinLock.isPaused) return;

        if (doInit)
          spinLock.secondsToPlay = 60;
        else
          if (spinLock.secondsToPlay == 0){
            $(document).trigger("game.gameover");
            clearInterval(timer_interval);
          }

        $('#timer').html(spinLock.secondsToPlay--);
      },
      draw: function() {
        if (spinLock.isPaused) return;
 
        spinLock.timer.setMilliseconds(spinLock.timer.getMilliseconds() + spinLock.interval);
        
        var time = new Date();

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();

        context.translate(canvas.width / 2, canvas.height / 2);

        circles_array.forEach(function (value, index, array) {
          var options = { radius: value.radius, 
                          e_angle: 2 * Math.PI * 0.9,
                          stroke: colors[index % colors.length],
                          blurred: value.blurred };
          
          toolBox.rotatingCircle(data.context, spinLock.timer, value, options);
        });

        context.restore();
      },
      is_game_won: function() {
        var win_flag = true,
            first_circle = circles_array[0];

        for (var i = 1; i < circles_array.length - 1; i++) {
          if (circles_array[i + 1].speed != first_circle.speed || circles_array[i + 1].angle != first_circle.angle)
            win_flag = false;
        }

        return win_flag;
      }
    }
    
    /*
     * Circle object
     */
    function Circle(position){
      var self = this;



      self.radius = (position + 1) * (toolBox.circleDefault.line_width + 5);
      self.angle = Math.floor((Math.random() * 100) + 0); 
      self.speed = (Math.random() * 4) + 1;
      
      // (2 * Math.PI) => Full canvas rotation
      // ((2 * Math.PI) / 6) * time.getSeconds() * speed_coef ==> A sixth of a cercle rotation - circles keep distances
      // ((2 * Math.PI) / 6000) * time.getMilliseconds() * speed_coef ==> a 1000th of a sixth - Alloc each circle to reduce distance
      self.calculateRotation = function(time){
        return ( (((2 * Math.PI) / toolBox.circleParts) * time.getSeconds() * self.speed) +
                (((2 * Math.PI) / (toolBox.circleParts * 1000)) * time.getMilliseconds() * self.speed)  + self.angle);
      }
 
      return self;
    }
    
    var User = {
      last_tap: null,
      score: 0,
      defineScore: function(){
        //  scoring: 
          // speed + combo + vitesse execution (délai précédente tape; au début niveau)

        // 200pts * ()

      }
    }

    /*
     * Drawing ToolBox
     */
    function toolBox() {};
    toolBox = {
      circleParts: 12,
      circleDefault: {
          center_x: 0,
          center_y: 0,
          radius: 20, 
          fill: 'transparent',
          line_width: 25,
          stroke: 'red',
          s_angle: 0,
          e_angle: 2 * Math.PI * 0.9
      },
      createCircles: function(circle_number) {
        var circles_array = [];

        for (var i = 0; i < circle_number; i++)
          circles_array.push(new Circle(i));

        return circles_array;
      },
      rotatingCircle: function(ctx, time, circle, circle_options) {
        ctx.save();
        ctx.rotate(circle.calculateRotation(time));
        
        toolBox.createCircle(ctx, circle_options);
        ctx.restore();
      },
      createCircle: function(ctx, options) {
        var options = $.extend({}, toolBox.circleDefault, options);

        ctx.beginPath();
        ctx.arc(options.center_x, options.center_y, options.radius, options.s_angle, options.e_angle, false);
        ctx.fillStyle = options.fill;
        ctx.fill();
        ctx.lineWidth = options.line_width;

        if (typeof options != "undefined" && options.blurred) {// add blur on lock circle to indicate the event
          ctx.shadowColor = '#00ff00';
          ctx.shadowBlur = 5;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        ctx.strokeStyle = options.stroke;
        ctx.stroke();
      }
    };

    $(document).on("keypress", function (e) {
      if (e.charCode == 32)
        $(document).trigger("game.spacebar");
    }).on("touchstart", "#spinlocker", function(e){
      $(document).trigger("game.spacebar");
    });

    // https://software.intel.com/en-us/blogs/2013/08/21/html5-canvas-tap-rotate-player-with-arctangent
    $(document).on("game.spacebar", function (e) {
      if (spinLock.isPaused) return;

      var time = spinLock.timer,
          circle_angle_1, circle_angle_2;
      
      for (var i = 0; i < circles_array.length; i++) {   
        circle_angle_1 = circles_array[i].calculateRotation(time) * (180 / Math.PI) % 360;
         
        for (var j = i + 1; j < circles_array.length; j++) {
          
          circle_angle_2 = circles_array[j].calculateRotation(time) * (180 / Math.PI) % 360;
          
          if (circle_angle_1 - circle_angle_2 < 12 && circle_angle_1 - circle_angle_2 > -12) {
            // Get the faster speed
            if (circles_array[i].speed > circles_array[j].speed){
              circles_array[j].speed = circles_array[i].speed;
              circles_array[j].angle = circles_array[i].angle;
            } else {
              circles_array[i].speed = circles_array[j].speed;
              circles_array[i].angle = circles_array[j].angle;
            }
            
            (function(i, j){
              circles_array[i].blurred = true;
              circles_array[j].blurred = true;

              setTimeout(function(){ 
                circles_array[j].blurred = false;
                circles_array[i].blurred = false }, 1000);
            })(i, j);
          }

        }
      }

      User.defineScore();
      User.last_tap = time;

      if (spinLock.is_game_won()) {
        $(document).trigger("game.won");
        return;
      }

      var countdown = parseInt($("#countdown").html());
      spinLock.setCountDown(countdown - 1);
    });

    /*
     * Custom Events
     */

    
    $(document)
    .on("game.gameover", function (e) {
      $("#gameover").slideDown();
      clearInterval(refresh_interval_id);
      clearInterval(timer_interval);
    })
    .on("game.won", function (e) {
      $("#won").slideDown();
      clearInterval(refresh_interval_id);
      clearInterval(timer_interval);
    })
    .on("game.nextLevel", function (e) {
      $(document).trigger("game.clearPopin");
      spinLock.init(spinLock.currentLevel++);
    })
    .on("game.clearPopin", function (e) {
      $("#won, #gameover").slideUp();
    })
    .on("game.togglePause", function (e) {
      spinLock.isPaused = !spinLock.isPaused;
    })
    .on("game.new", function (e) {
      spinLock.init();
      $(document).trigger("game.clearPopin");
    })
    .on("game.newConfirm", function (e) {
      if (confirm("Cette action supprimera toute progression sur ce niveau. Recommencer?")){
        spinLock.init();
        $(document).trigger("game.clearPopin");
      }
    });

}); // end $(function(){});


/*
 * Public scope
 */
function game() {}
game = {
  new: function(){
    $(document).trigger("game.new");
  },
  start: function(){
    $(document).trigger("game.newConfirm");
  },
  togglePause: function(){
    $(document).trigger("game.togglePause");
  },
  nextLevel: function(){
    $(document).trigger("game.nextLevel");
  }
}

$(document).ready(function(){
  $('#splash-screen').on('click.showGame', function(){
    $('#splash-screen').hide();
    game.new();
  });
});
