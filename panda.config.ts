import { defineConfig } from "@pandacss/dev"

export default defineConfig({
    eject: true,

    // Whether to use css reset
    preflight: false,

    minify: true,

    hash: true,

    prefix: 'gl',
    
    "gitignore": true,

    // Where to look for your css declarations
    include: ["./src/**/*.{js,jsx,ts,tsx}"],

    // Files to exclude
    exclude: [],

    // The output directory for your css system
    outdir: "styled-system",
    
    jsxFramework: 'react',
})