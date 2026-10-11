#!/usr/bin/env ruby
# ─────────────────────────────────────────────────────────────
#  Site checker
#
#  Catches common editing mistakes before they reach visitors:
#  a typo in a .yml file, a photo listed but never uploaded, a
#  missing photo description, two questionnaire questions with
#  the same id, and so on.
#
#  It runs by itself on GitHub every time a change is committed
#  (see .github/workflows/check-site.yml). A red ✗ next to
#  "Check site" in the Actions tab means it found a problem; click
#  it to read which file and what to fix.
#
#  To run it on your own computer:   ruby scripts/check-site.rb
#  It only needs Ruby, no extra gems.
# ─────────────────────────────────────────────────────────────
require "yaml"

ROOT = File.expand_path("..", __dir__)
$errors = []
$warnings = []

def error(msg)
  $errors << msg
end

def warning(msg)
  $warnings << msg
end

def load_yaml(rel)
  YAML.safe_load(File.read(File.join(ROOT, rel)), aliases: true)
rescue Psych::SyntaxError => e
  error("#{rel}: can't be read (line #{e.line}, column #{e.column}). " \
        "Usually wrong indentation, a tab instead of spaces, or a missing quote.")
  nil
rescue Errno::ENOENT
  error("#{rel}: file is missing")
  nil
end

# A photo entry: the file must exist and it needs a description.
def check_photo(source, folder, file, alt)
  if file.to_s.strip.empty?
    error("#{source}: a photo file name is missing")
    return
  end
  if file.to_s.include?(" ")
    error("#{source}: photo \"#{file}\" has a space in its name. Rename the file (and this entry) without spaces.")
  end
  path = File.join(ROOT, folder, file.to_s)
  if !File.exist?(path)
    error("#{source}: photo \"#{file}\" isn't in #{folder}/. Upload it there, or check the spelling (capital letters count).")
  elsif File.size(path) > 1_000_000
    warning("#{folder}/#{file} is #{(File.size(path) / 1_000_000.0).round(1)} MB. " \
            "Resizing it to about 1400 pixels wide will make the page load faster.")
  end
  if alt.to_s.strip.empty?
    error("#{source}: photo \"#{file}\" needs a description (photo_alt / alt)")
  end
end

# ── Settings ─────────────────────────────────────────────────
config = load_yaml("_config.yml") || {}
%w[title short_title email url].each do |key|
  error("_config.yml: \"#{key}\" is empty") if config[key].to_s.strip.empty?
end
unless config["email"].to_s =~ /\A[^\s@]+@[^\s@]+\.[^\s@]+\z/
  error("_config.yml: email \"#{config['email']}\" doesn't look like an email address")
end
%w[facebook instagram].each do |key|
  v = config[key].to_s
  error("_config.yml: #{key} should start with https://") unless v.empty? || v.start_with?("https://")
end

# ── Home page ────────────────────────────────────────────────
if (home = load_yaml("_data/home.yml"))
  %w[hero about puppies].each do |part|
    section = home[part] || {}
    check_photo("_data/home.yml (#{part})", "assets/img", section["photo"], section["photo_alt"])
  end
end

# ── Litter panel ─────────────────────────────────────────────
if (litter = load_yaml("_data/litter.yml"))
  show = litter["show"]
  # "off" is read as false by YAML, so both are accepted.
  unless ["planning", "current", false, "off"].include?(show)
    error("_data/litter.yml: show is \"#{show}\". It must be planning, current or off.")
  end
  if show == "current"
    current = litter["current"] || {}
    %w[mother father].each do |role|
      dog = current[role]
      next unless dog
      check_photo("_data/litter.yml (#{role})", "assets/img/litter", dog["photo"], dog["photo_alt"])
    end
  end
  if show.is_a?(String) && %w[planning current].include?(show) && !litter[show].is_a?(Hash)
    error("_data/litter.yml: show is #{show}, but there is no \"#{show}:\" section")
  end
end

# ── Gallery ──────────────────────────────────────────────────
if (gallery = load_yaml("_data/gallery.yml"))
  gallery.each_with_index do |g, i|
    check_photo("_data/gallery.yml (photo #{i + 1})", "assets/img/gallery", g["file"], g["alt"])
  end
  unless (gallery.size % 3).zero?
    warning("_data/gallery.yml has #{gallery.size} photos. The grid looks tidiest with a multiple of 3.")
  end
end

# ── Our Leos ─────────────────────────────────────────────────
if (leos = load_yaml("_data/leos.yml"))
  (leos["dogs"] || []).each do |d|
    name = d["name"] || "(a dog with no name)"
    error("_data/leos.yml: a dog has no name") unless d["name"]
    check_photo("_data/leos.yml (#{name})", "assets/img/leos", d["photo"], d["photo_alt"])
  end
end

# ── Questionnaire ────────────────────────────────────────────
TYPES = %w[text textarea email tel select radio checkbox name address].freeze
NEEDS_OPTIONS = %w[select radio checkbox].freeze
if (q = load_yaml("_data/questionnaire.yml"))
  ids = Hash.new(0)
  types = Hash.new(0)
  (q["sections"] || []).each do |section|
    error("_data/questionnaire.yml: a section has no title") if section["title"].to_s.empty?
    (section["questions"] || []).each do |question|
      label = question["label"] || "(no label)"
      where = "_data/questionnaire.yml, \"#{label}\""
      type = question["type"] || "text"
      types[type] += 1
      error("#{where}: has no label") unless question["label"]
      error("#{where}: type \"#{type}\" isn't one of: #{TYPES.join(', ')}") unless TYPES.include?(type)
      next if %w[name address].include?(type) # these have built-in field names

      id = question["id"].to_s
      if id.empty?
        error("#{where}: needs an id")
      elsif id !~ /\A[a-z0-9_]+\z/
        error("#{where}: id \"#{id}\" should use only lowercase letters, numbers and _")
      else
        ids[id] += 1
      end
      if NEEDS_OPTIONS.include?(type) && Array(question["options"]).empty?
        error("#{where}: a #{type} question needs a list of options")
      end
    end
  end
  ids.each { |id, n| error("_data/questionnaire.yml: the id \"#{id}\" is used #{n} times. Each id must be different.") if n > 1 }
  error("_data/questionnaire.yml: needs an email question with id: email (used for replies)") unless ids.key?("email")
  error("_data/questionnaire.yml: needs a question with type: name (used in the email subject)") if types["name"].zero?
  %w[name address].each do |t|
    error("_data/questionnaire.yml: type: #{t} can only be used once") if types[t] > 1
  end
  ty = q["thank_you"] || {}
  check_photo("_data/questionnaire.yml (thank_you)", "assets/img", ty["photo"], ty["photo_alt"])
end

# ── Menu ─────────────────────────────────────────────────────
if (nav = load_yaml("_data/navigation.yml"))
  nav.each do |item|
    error("_data/navigation.yml: every link needs a label and a url") unless item["label"] && item["url"]
    if item["setting"] && !config.key?(item["setting"])
      error("_data/navigation.yml: \"#{item['label']}\" uses setting #{item['setting']}, which isn't in _config.yml")
    end
  end
end

# ── Report ───────────────────────────────────────────────────
$warnings.each { |w| puts "⚠️  #{w}" }
$errors.each { |e| puts "❌ #{e}" }
if $errors.empty?
  puts "✅ All checks passed#{$warnings.empty? ? '' : " (#{$warnings.size} suggestion#{'s' if $warnings.size > 1} above)"}."
else
  puts "\n#{$errors.size} problem#{'s' if $errors.size > 1} found. Fix #{$errors.size > 1 ? 'them' : 'it'} and commit again."
  exit 1
end
