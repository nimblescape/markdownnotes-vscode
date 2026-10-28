package main

import (
	"bytes"
	"io"
	"os"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/renderer/html"
)

func main() {
	src, _ := io.ReadAll(os.Stdin)
	md := goldmark.New(goldmark.WithExtensions(extension.GFM, extension.Footnote), goldmark.WithRendererOptions(html.WithUnsafe()))
	var buf bytes.Buffer
	if err := md.Convert(src, &buf); err != nil {
		panic(err)
	}
	os.Stdout.Write(buf.Bytes())
}
