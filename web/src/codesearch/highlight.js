var filenameToLangMap = {
  'BUILD': 'python',
  'BUILD.bazel': 'python',
  'WORKSPACE': 'python',
};

var extToLangMap = {
  '.adoc': 'asciidoc',
  '.asc': 'asciidoc',
  '.asciidoc': 'asciidoc',
  '.applescript': 'applescript',
  '.bzl': 'python',
  '.c': 'c',
  '.coffee': 'coffeescript',
  '.cpp': 'cpp',
  '.css': 'css',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.go': 'go',
  '.h': 'cpp',
  '.hs': 'haskell',
  '.html': 'markup',
  '.java': 'java',
  '.js': 'javascript',
  '.json': 'json',
  '.jsx': 'jsx',
  '.m': 'objectivec',
  '.markdown': 'markdown',
  '.md': 'markdown',
  '.mdown': 'markdown',
  '.mkdn': 'markdown',
  '.mediawiki': 'markdown',
  '.nix': 'nix',
  '.php': 'php',
  '.pl': 'perl',
  '.proto': 'protobuf',
  '.py': 'python',
  '.pyst': 'python',
  '.rb': 'ruby',
  '.rdoc': 'markdown',
  '.rs': 'rust',
  '.scala': 'scala',
  '.scpt': 'applescript',
  '.scss': 'scss',
  '.sh': 'bash',
  '.sky': 'python',
  '.sql': 'sql',
  '.swift': 'swift',
  '.textile': 'markdown',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.wiki': 'markdown',
  '.xml': 'markup',
  '.yaml': 'yaml',
  '.yml': 'yaml',
};

function detectLanguage(filePath) {
  if (!filePath) return null;
  var basename = filePath.substring(filePath.lastIndexOf('/') + 1);
  if (filenameToLangMap[basename]) return filenameToLangMap[basename];
  var dotIndex = basename.lastIndexOf('.');
  if (dotIndex === -1) return null;
  var ext = basename.substring(dotIndex);
  return extToLangMap[ext] || null;
}

/**
 * Flatten Prism's nested token tree into a flat array of {type, text} segments.
 */
function flattenTokens(tokens) {
  var result = [];
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    if (typeof token === 'string') {
      result.push({type: null, alias: null, text: token});
    } else if (token.content) {
      var alias = token.alias || null;
      if (typeof token.content === 'string') {
        result.push({type: token.type, alias: alias, text: token.content});
      } else {
        // Nested tokens - flatten and inherit type/alias for untyped children
        var nested = flattenTokens(
          Array.isArray(token.content) ? token.content : [token.content]
        );
        for (var j = 0; j < nested.length; j++) {
          result.push({
            type: nested[j].type || token.type,
            alias: nested[j].alias || alias,
            text: nested[j].text
          });
        }
      }
    }
  }
  return result;
}

/**
 * Split segments at the given character offsets so that each boundary
 * falls on a segment edge.
 */
function splitAtBounds(segments, bounds) {
  var result = [];
  var pos = 0;
  var bi = 0;
  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i];
    var segStart = pos;
    var segEnd = pos + seg.text.length;

    // Advance past any bounds at or before the segment start (on boundaries, no cut needed)
    while (bi < bounds.length && bounds[bi] <= segStart) bi++;

    // Collect cuts that fall strictly within this segment
    var cuts = [];
    while (bi < bounds.length && bounds[bi] < segEnd) {
      cuts.push(bounds[bi] - segStart);
      bi++;
    }

    if (cuts.length === 0) {
      result.push(seg);
    } else {
      var lastCut = 0;
      for (var c = 0; c < cuts.length; c++) {
        if (cuts[c] > lastCut) {
          result.push({type: seg.type, alias: seg.alias, text: seg.text.substring(lastCut, cuts[c])});
        }
        lastCut = cuts[c];
      }
      if (lastCut < seg.text.length) {
        result.push({type: seg.type, alias: seg.alias, text: seg.text.substring(lastCut)});
      }
    }

    pos = segEnd;
  }
  return result;
}

/**
 * Build DOM nodes from segments, applying matchstr class to segments within bounds.
 */
function buildNodes(segments, matchStart, matchEnd) {
  var nodes = [];
  var pos = 0;
  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i];
    var segEnd = pos + seg.text.length;
    var inMatch = (pos >= matchStart && segEnd <= matchEnd);

    var hasType = seg.type || seg.alias;
    if (!hasType && !inMatch) {
      nodes.push(document.createTextNode(seg.text));
    } else {
      var span = document.createElement('span');
      var classes = [];
      if (hasType) {
        classes.push('token');
        if (seg.type) classes.push(seg.type);
        if (seg.alias) {
          if (Array.isArray(seg.alias)) {
            for (var a = 0; a < seg.alias.length; a++) classes.push(seg.alias[a]);
          } else {
            classes.push(seg.alias);
          }
        }
      }
      if (inMatch) {
        classes.push('matchstr');
      }
      span.className = classes.join(' ');
      span.appendChild(document.createTextNode(seg.text));
      nodes.push(span);
    }
    pos = segEnd;
  }
  return nodes;
}

/**
 * Highlight a match line with syntax coloring and match-bound highlighting.
 * Returns an array of DOM nodes, or null if Prism/grammar unavailable.
 */
function highlightLine(text, language, bounds) {
  if (typeof Prism === 'undefined' || !language || !Prism.languages[language]) {
    return null;
  }
  var grammar = Prism.languages[language];
  var tokens = Prism.tokenize(text, grammar);
  var segments = flattenTokens(tokens);
  segments = splitAtBounds(segments, [bounds[0], bounds[1]]);
  return buildNodes(segments, bounds[0], bounds[1]);
}

/**
 * Highlight a context line (no match bounds).
 * Returns an array of DOM nodes, or null if Prism/grammar unavailable.
 */
function highlightContext(text, language) {
  if (typeof Prism === 'undefined' || !language || !Prism.languages[language]) {
    return null;
  }
  var grammar = Prism.languages[language];
  var tokens = Prism.tokenize(text, grammar);
  var segments = flattenTokens(tokens);
  return buildNodes(segments, -1, -1);
}

module.exports = {
  detectLanguage: detectLanguage,
  highlightLine: highlightLine,
  highlightContext: highlightContext,
};
