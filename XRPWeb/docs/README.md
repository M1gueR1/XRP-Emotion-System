# Instructions

The XRP Architecture Document is created using Markdown and Plantuml. To view the Architecture Document Markdown document within Visual Studio Code. Please install the following VSCode plugins.

- [Plantuml](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml)
- [Markdown Preview](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)

## Exporting to PDF

To export the Markdown file, these are the tools need to be installed on your system.

- [pandoc-plantuml](https://github.com/Masquerade-Circus/pandoc-plantuml?tab=readme-ov-file)
- [pandoc](https://pandoc.org/)
- [plantuml](https://plantuml.com/)

```
pandoc docs/XRP\ Software\ Architecture.md --pdf-engine=xelatex -V "mainfont:DejaVu Sans" -V "monofont:DejaVu Sans Mono" -t pdf -F pandoc-plantuml -o "XRP Software Architecture".pdf
```

## References

- [Markdown Cheatsheet](https://www.markdownguide.org/cheat-sheet/)
- [Plantuml](https://plantuml.com/)
- [C4 Plantuml](https://github.com/plantuml-stdlib/C4-PlantUML)