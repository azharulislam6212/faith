 gsap.registerPlugin(ScrollTrigger, SplitText);



 const anim_reveal = document.querySelectorAll(".has_text_reveal_anim");

anim_reveal.forEach(areveal => {

    var duration_value = 1.5
    var onscroll_value = 1
    var stagger_value = 0.02
    var data_delay = 0.05

    if (areveal.getAttribute("data-duration")) {
        duration_value = areveal.getAttribute("data-duration");
    }
    if (areveal.getAttribute("data-on-scroll")) {
        onscroll_value = areveal.getAttribute("data-on-scroll");
    }
    if (areveal.getAttribute("data-stagger")) {
        stagger_value = areveal.getAttribute("data-stagger");
    }
    if (areveal.getAttribute("data-delay")) {
        data_delay = areveal.getAttribute("data-delay");
    }



    areveal.split = new SplitText(areveal, {
        type: "lines,words,chars",
        linesClass: "anim-reveal-line"
    });

    if (onscroll_value == 1) {
        areveal.anim = gsap.from(areveal.split.chars, {
            scrollTrigger: {
                trigger: areveal,
                start: 'top 85%',
            },
            duration: duration_value,
            delay: data_delay,
            ease: "circ.out",
            y: 80,
            stagger: stagger_value,
            opacity: 0,
        });
    } else {
        areveal.anim = gsap.from(areveal.split.chars, {
            duration: duration_value,
            delay: data_delay,
            ease: "circ.out",
            y: 80,
            stagger: stagger_value,
            opacity: 0,
        });
    }

});




const fadeArray = gsap.utils.toArray(".has_fade_anim")
// gsap.set(fadeArray, {opacity:0})
fadeArray.forEach((item, i) => {

    var fade_direction = "bottom"
    var onscroll_value = 1
    var duration_value = 1.5
    var fade_offset = 50
    var delay_value = 0.5
    var ease_value = "power2.out"

    if (item.getAttribute("data-fade-offset")) {
        fade_offset = item.getAttribute("data-fade-offset");
    }
    if (item.getAttribute("data-duration")) {
        duration_value = item.getAttribute("data-duration");
    }

    if (item.getAttribute("data-fade-from")) {
        fade_direction = item.getAttribute("data-fade-from");
    }
    if (item.getAttribute("data-on-scroll")) {
        onscroll_value = item.getAttribute("data-on-scroll");
    }
    if (item.getAttribute("data-delay")) {
        delay_value = item.getAttribute("data-delay");
    }
    if (item.getAttribute("data-ease")) {
        ease_value = item.getAttribute("data-ease");
    }

    if (onscroll_value == 1) {
        if (fade_direction == "top") {
            gsap.from(item, {
                y: -fade_offset,
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%',
                    toggleActions: "play none none reverse"
                }
            })
        }
        if (fade_direction == "left") {
            gsap.from(item, {
                x: -fade_offset,
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%',
                    toggleActions: "play none none reverse"
                }
            })
        }
        if (fade_direction == "bottom") {
            gsap.from(item, {
                y: fade_offset,
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%',
                    toggleActions: "play none none reverse"
                }
            })
        }
        if (fade_direction == "right") {
            gsap.from(item, {
                x: fade_offset,
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%',
                    toggleActions: "play none none reverse"
                }
            })
        }
        if (fade_direction == "in") {
            gsap.from(item, {
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%',
                    toggleActions: "play none none reverse"
                }
            })
        }
    }
    else {
        if (fade_direction == "top") {
            gsap.from(item, {
                y: -fade_offset,
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
            })
        }
        if (fade_direction == "left") {
            gsap.from(item, {
                x: -fade_offset,
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
            })
        }
        if (fade_direction == "bottom") {
            gsap.from(item, {
                y: fade_offset,
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
            })
        }
        if (fade_direction == "right") {
            gsap.from(item, {
                x: fade_offset,
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
            })
        }
        if (fade_direction == "in") {
            gsap.from(item, {
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
            })
        }
    }

})












// // ===== Preset animations (fade, slide, zoom etc) =====
// const animations = {
//   fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
//   fadeInUp: { from: { y: 60, opacity: 0 }, to: { y: 0, opacity: 1 } },
//   fadeInDown: { from: { y: -60, opacity: 0 }, to: { y: 0, opacity: 1 } },
//   fadeInLeft: { from: { x: -60, opacity: 0 }, to: { x: 0, opacity: 1 } },
//   fadeInRight: { from: { x: 60, opacity: 0 }, to: { x: 0, opacity: 1 } },
//   fadeInLeftBig: { from: { x: -200, opacity: 0 }, to: { x: 0, opacity: 1 } },
//   fadeInRightBig: { from: { x: 200, opacity: 0 }, to: { x: 0, opacity: 1 } },
//   fadeInUpBig: { from: { y: 200, opacity: 0 }, to: { y: 0, opacity: 1 } },
//   fadeInDownBig: { from: { y: -200, opacity: 0 }, to: { y: 0, opacity: 1 } },
//   fadeInTopLeft: { from: { x: -100, y: -100, opacity: 0 }, to: { x: 0, y: 0, opacity: 1 } },
//   fadeInTopRight: { from: { x: 100, y: -100, opacity: 0 }, to: { x: 0, y: 0, opacity: 1 } },
//   fadeInBottomLeft: { from: { x: -100, y: 100, opacity: 0 }, to: { x: 0, y: 0, opacity: 1 } },
//   fadeInBottomRight: { from: { x: 100, y: 100, opacity: 0 }, to: { x: 0, y: 0, opacity: 1 } },
//   lightSpeedInRight: { from: { x: 200, skewX: -30, opacity: 0 }, to: { x: 0, skewX: 0, opacity: 1 } },
//   lightSpeedInLeft: { from: { x: -200, skewX: 30, opacity: 0 }, to: { x: 0, skewX: 0, opacity: 1 } },
//   jackInTheBox: { from: { scale: 0.2, rotate: -30, opacity: 0 }, to: { scale: 1, rotate: 0, opacity: 1, ease: "back" } },
//   zoomIn: { from: { scale: 0.5, opacity: 0 }, to: { scale: 1, opacity: 1 } },
//   slideInDown: { from: { y: -200, opacity: 0 }, to: { y: 0, opacity: 1 } },
//   slideInLeft: { from: { x: -200, opacity: 0 }, to: { x: 0, opacity: 1 } },
//   slideInRight: { from: { x: 200, opacity: 0 }, to: { x: 0, opacity: 1 } },
//   slideInUp: { from: { y: 200, opacity: 0 }, to: { y: 0, opacity: 1 } },
// };


// // ===== Animate preset classes (.animate) =====
// gsap.utils.toArray(".animate").forEach(el => {

//   const type = Object.keys(animations).find(key => el.classList.contains(key));
//   const duration = parseFloat(el.dataset.duration) || 1.2;
//   const delay = parseFloat(el.dataset.delay) || 0;
  
//   if (!type) return;

//   gsap.fromTo(
//     el,
//     { ...animations[type].from, immediateRender: false },
//     {
//       ...animations[type].to,
//       duration,
//       ease: "power3.out",
//       delay,
//       scrollTrigger: {
//         trigger: el,
//         start: "top 100%", 
//          end: "bottom 0%", 
//         toggleActions: "play none none reverse"
//       }
//     }
//   );
// });



// // ===== Animate lines (.has_text_move_anim) =====
// gsap.utils.toArray(".has_text_move_anim").forEach(el => {
//   const duration = parseFloat(el.dataset.duration) || 1;
//   const delay = parseFloat(el.dataset.delay) || 0;
//   const split = new SplitText(el, { type: "lines" });
//   gsap.set(el, { perspective: 400 });

//   gsap.from(split.lines, {
//     duration,
//     delay,
//     opacity: 0,
//     rotationX: -80,
//     force3D: true,
//     transformOrigin: "top center -50",
//     stagger: 0.15, // stagger one by one
//     ease: "power3.out",
//     immediateRender: false,
//     scrollTrigger: {
//       trigger: el,
//       start: "top 85%",
//       toggleActions: "play none none reverse"
//     }
//   });
// });

// // ===== Animate words/chars (.animate-split) =====
// gsap.utils.toArray(".animate-split").forEach(el => {
//   const type = el.dataset.type || "chars"; // chars, words, lines
   
//   const delay = parseFloat(el.dataset.delay) || 0;
//   const split = new SplitText(el, { type });


//     let  stagger;
//   if(type === "words"){
//     duration = parseFloat(el.dataset.duration) || 1; // slower for words
//     stagger = parseFloat(el.dataset.stagger) || 0.15; // noticeable
//   } else if(type === "chars"){
//     duration = parseFloat(el.dataset.duration) || 0.6; // faster for chars
//     stagger = parseFloat(el.dataset.stagger) || 0.03; // fast
//   } else { // lines
//     duration = parseFloat(el.dataset.duration) || 1;
//     stagger = parseFloat(el.dataset.stagger) || 0.1;
//   }


//   gsap.from(split[type], {
//    duration,
//     delay,
//     opacity: 0,
//     y: type === "chars" ? 30 : 20,
//     x: type === "words" ? 30 : 0,
//     rotation: type === "chars" ? "random(-50,50)" : 0,
//     stagger: stagger,
//     ease: "power3.out",
//     immediateRender: false,
//     scrollTrigger: {
//       trigger: el,
//       start: "top 85%",
//       toggleActions: "play none none reverse"
//     }
//   });
// });


const fadeUpElements = document.querySelectorAll("section .fade-up, footer .fade-up");

if(fadeUpElements.length) {
  gsap.from(fadeUpElements, {
    opacity: 0,
    y: 100,
    scale: 0.8,
    duration: 1.5,
    ease: "power2.out",
    stagger: 0.1,
    scrollTrigger: {
      trigger: fadeUpElements[0].closest('section, footer'),
      start: "top center",
      toggleActions: "play none none none"
    }
  });
}

 
   



const promoTrigger = document.querySelector('.collection-promo-animate');
const promoItems   = document.querySelectorAll('.collection-promo-fad-up');

if (promoTrigger && promoItems.length) {
  gsap.from(promoItems, {
    scrollTrigger: {
      trigger: promoTrigger,
      start: 'top 90%',
    },
    opacity: 0,
    y: 50,
    duration: 2,
    ease: 'power2.out',
    stagger: 0.2,
  });
}



window.addEventListener('resize', () => {
  ScrollTrigger.refresh();
});