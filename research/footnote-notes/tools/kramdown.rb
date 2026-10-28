require 'kramdown'
require 'kramdown-parser-gfm'
doc = Kramdown::Document.new(File.read(ARGV[0], encoding: 'UTF-8'), input: 'GFM', hard_wrap: false)
puts doc.to_html
doc.warnings.each { |w| STDERR.puts "WARNING: #{w}" }
