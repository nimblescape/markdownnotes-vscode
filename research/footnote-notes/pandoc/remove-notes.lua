-- Removes the notes of nimblescape Markdown Notes from a Pandoc document:
-- footnotes whose first line is "**login** · YYYY-MM-DD HH:MM".
-- Other footnotes stay. Use: pandoc --lua-filter remove-notes.lua ...
local function is_note(note)
  local first = note.content[1]
  if not first or (first.t ~= 'Para' and first.t ~= 'Plain') then
    return false
  end
  local inlines = first.content
  return #inlines >= 5
    and inlines[1].t == 'Strong'
    and inlines[2].t == 'Space'
    and inlines[3].t == 'Str' and inlines[3].text == '·'
    and inlines[5].t == 'Str' and inlines[5].text:match('^%d%d%d%d%-%d%d%-%d%d$') ~= nil
end

function Note(note)
  if is_note(note) then
    return {}
  end
end
