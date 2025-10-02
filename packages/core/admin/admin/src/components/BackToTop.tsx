import React, { useEffect, useState } from "react";
import { Box, Button } from "@strapi/design-system";

const BackToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <Box
      position="fixed"
      bottom="2rem"
      right="2rem"
      zIndex={1000}
      shadow="filterShadow"
    >
      <Button onClick={scrollToTop} variant="secondary" size="L">
        ↑ Back to Top
      </Button>
    </Box>
  );
};

export default BackToTop;
