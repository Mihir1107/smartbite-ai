"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, Zap } from "lucide-react";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["Delicious", "Blazing Fast", "Beautiful", "Bold", "Crispy"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full">
      <div className="container mx-auto px-4">
        <div className="flex gap-8 py-20 lg:py-32 items-center justify-center flex-col">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 bg-[#FFC72C] text-[#1A1A1A] font-bold px-4 py-2 rounded-full text-sm border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
              <Zap className="w-4 h-4 fill-[#DA291C] text-[#DA291C]" />
              Now Serving Components
              <MoveRight className="w-4 h-4" />
            </span>
          </motion.div>

          <div className="flex gap-4 flex-col items-center">
            <motion.h1
              className="text-6xl md:text-8xl max-w-3xl tracking-tight text-center font-black"
              style={{ fontFamily: "'Fredoka One', 'Nunito', cursive" }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-[#1A1A1A] dark:text-white">Build Fast.</span>
              <br />
              <span className="relative flex w-full justify-center overflow-hidden text-center pb-4 pt-1 min-h-[1.2em]">
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute text-[#DA291C]"
                    initial={{ opacity: 0, y: 100 }}
                    transition={{ type: "spring", stiffness: 60, damping: 15 }}
                    animate={
                      titleNumber === index
                        ? { y: 0, opacity: 1 }
                        : { y: titleNumber > index ? -150 : 150, opacity: 0 }
                    }
                  >
                    {title}.
                  </motion.span>
                ))}
              </span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl leading-relaxed text-[#555] dark:text-[#aaa] max-w-2xl text-center font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              PetPooja is your complete UI component library with a bold, 
              fast-food-inspired design system. Serve up great interfaces — 
              hot, fresh, and pixel-perfect every time.
            </motion.p>
          </div>

          <motion.div
            className="flex flex-row gap-4 flex-wrap justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <a
              href="#components"
              className="inline-flex items-center gap-2 bg-[#DA291C] text-white font-bold px-8 py-4 rounded-2xl text-lg border-2 border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:scale-[0.96]"
            >
              See the Menu <MoveRight className="w-5 h-5" />
            </a>
            <a
              href="#palette"
              className="inline-flex items-center gap-2 bg-[#FFC72C] text-[#1A1A1A] font-bold px-8 py-4 rounded-2xl text-lg border-2 border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:scale-[0.96]"
            >
              Explore Colors
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
