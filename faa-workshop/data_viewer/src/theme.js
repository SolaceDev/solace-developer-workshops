import { createTheme } from '@mui/material/styles';

// Solace color scheme
export const solaceColors = {
  // Greens (Primary Brand Colors)
  primary: '#00BD6A',
  primaryVariant: '#38C76F',
  tealGreen: '#00DA90',
  gradientMid: '#41E38B',
  accentGreen: '#67E791',
  gradientStart: '#69E78C',
  lightGradient: '#80E382',
  diagramDark: '#84D9BB',
  diagramMid: '#9DDDC6',
  circleLightest: '#A9F7B3',
  diagramBorders: '#B1F2D6',
  circleMid: '#4CD191',
  tealAccent: '#00A68A',
  patternLines: '#D2EFE2',
  
  // Dark Navy / Blue
  darkNavy: '#042542',
  darkTealBlue: '#194A6E',
  
  // Neutrals & Text
  veryDarkGrey: '#212121',
  primaryDarkText: '#282F3B',
  secondaryText: '#4D5765',
  subHeadline: '#4D5E6E',
  mediumDarkGrey: '#5C5C5C',
  lightGrey: '#8D99A6',
  darkGreyIcons: '#404040',
  dashedLines: '#C5C5C5',
  shadows: '#EAEAEA',
  
  // Backgrounds
  white: '#FFFFFF',
  greenTint: '#F5FFF7',
};

const theme = createTheme({
  palette: {
    primary: {
      main: solaceColors.primary,
      dark: solaceColors.darkNavy,
      light: solaceColors.lightGradient,
    },
    secondary: {
      main: solaceColors.tealAccent,
      dark: solaceColors.darkTealBlue,
    },
    background: {
      default: solaceColors.greenTint,
      paper: solaceColors.white,
    },
    text: {
      primary: solaceColors.primaryDarkText,
      secondary: solaceColors.secondaryText,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      color: solaceColors.darkNavy,
      fontWeight: 600,
    },
    h6: {
      color: solaceColors.darkNavy,
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
        contained: {
          background: `linear-gradient(135deg, ${solaceColors.gradientStart} 0%, ${solaceColors.gradientMid} 50%, ${solaceColors.tealGreen} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${solaceColors.primary} 0%, ${solaceColors.tealAccent} 100%)`,
          },
          '&:disabled': {
            background: solaceColors.lightGrey,
            color: solaceColors.white,
          },
        },
        outlined: {
          borderColor: solaceColors.primary,
          color: solaceColors.primary,
          '&:hover': {
            borderColor: solaceColors.tealAccent,
            backgroundColor: solaceColors.patternLines,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          '&.Mui-selected': {
            backgroundColor: solaceColors.primary,
            color: solaceColors.white,
            '&:hover': {
              backgroundColor: solaceColors.tealAccent,
            },
          },
        },
      },
    },
  },
});

export default theme;
