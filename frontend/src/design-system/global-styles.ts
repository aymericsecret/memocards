import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  @import url("https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap");
  @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20,400,0,0&display=swap");

  :root {
    --background: 40 20% 99%;
    --foreground: 220 15% 22%;
    --card: 0 0% 100%;
    --popover: 0 0% 100%;
    --primary: 220 15% 22%;
    --primary-foreground: 0 0% 100%;
    --secondary: 220 14% 96%;
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;
    --accent: 150 55% 40%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 75% 55%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 220 15% 22%;
    --radius: 0.75rem;
    --font-display: "Geist", sans-serif;
    --font-body: "Geist", sans-serif;

    color: ${({ theme }) => theme.colors.foreground};
    background: ${({ theme }) => theme.colors.background};
    font-family: ${({ theme }) => theme.fonts.body};
    font-synthesis: none;
    text-rendering: optimizeLegibility;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-width: 320px;
    background: ${({ theme }) => theme.colors.background};
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  h1,
  h2,
  h3 {
    font-family: ${({ theme }) => theme.fonts.display};
  }
`;
