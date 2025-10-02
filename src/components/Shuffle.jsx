import React, { useRef, useEffect } from "react";
import gsap from "gsap";

const Shuffle = ({
  text = "",
  shuffleDirection = "right",
  duration = 0.35,
  animationMode = "evenodd",
  shuffleTimes = 1,
  ease = "power3.out",
  stagger = 0.03,
  threshold = 0.1,
  triggerOnce = true,
  triggerOnHover = false,
  respectReducedMotion = true,
  className = ""
}) => {
  const textRef = useRef();
  const chars = text.split("");

  useEffect(() => {
    if (respectReducedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!triggerOnHover) animateShuffle();
    // eslint-disable-next-line
  }, []);

  const animateShuffle = () => {
    const targets = textRef.current.childNodes;
    gsap.to(targets, {
      x: shuffleDirection === "right" ? 20 : shuffleDirection === "left" ? -20 : 0,
      y: shuffleDirection === "top" ? -20 : shuffleDirection === "bottom" ? 20 : 0,
      opacity: 0,
      duration,
      ease,
      stagger: {
        amount: chars.length * stagger,
        each: stagger,
        grid: "auto",
        from: animationMode === "evenodd" ? "edges" : "start"
      },
      onComplete: () => {
        gsap.to(targets, {
          x: 0,
          y: 0,
          opacity: 1,
          duration,
          ease,
          stagger: {
            amount: chars.length * stagger,
            each: stagger,
            grid: "auto",
            from: animationMode === "evenodd" ? "center" : "end"
          }
        });
      }
    });
  };

  const handleHover = () => {
    if (triggerOnHover) animateShuffle();
  };

  return (
    <span
      ref={textRef}
      className={className}
      style={{ display: "inline-block", cursor: triggerOnHover ? "pointer" : "default" }}
      onMouseEnter={handleHover}
    >
      {chars.map((char, i) => (
        <span key={i} style={{ display: "inline-block" }}>{char}</span>
      ))}
    </span>
  );
};

export default Shuffle;
