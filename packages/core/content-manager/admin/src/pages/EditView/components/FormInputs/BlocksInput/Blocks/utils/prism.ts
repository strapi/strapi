/* eslint-disable */
// @ts-nocheck
/* PrismJS 1.29.0
https://prismjs.com/download.html?themes#themes=prism-solarizedlight&languages=markup+css+clike+javascript+armasm+bash+basic+c+csharp+cpp+clojure+cobol+dart+docker+elixir+erlang+fsharp+fortran+go+graphql+groovy+haskell+haxe+ini+java+json+julia+kotlin+latex+lua+makefile+markdown+markup-templating+mata+matlab+objectivec+perl+php+powershell+python+r+jsx+tsx+ruby+rust+sas+scala+scheme+shell-session+sql+stata+swift+typescript+vbnet+xml-doc+yaml */
/// <reference lib="WebWorker"/>

const _self =
  typeof window !== 'undefined'
    ? window // if in browser
    : typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope
      ? self // if in worker
      : {}; // if in node js

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */
const Prism = (function (_self) {
  // Private helper vars
  var lang = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i;
  var uniqueId = 0;

  // The grammar object for plaintext
  var plainTextGrammar = {};

  var _ = {
    /**
     * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
     * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
     * additional languages or plugins yourself.
     *
     * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
     *
     * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
     * empty Prism object into the global scope before loading the Prism script like this:
     *
     * ```js
     * window.Prism = window.Prism || {};
     * Prism.manual = true;
     * // add a new <script> to load Prism's script
     * ```
     *
     * @default false
     * @type {boolean}
     * @memberof Prism
     * @public
     */
    manual: _self.Prism && _self.Prism.manual,
    /**
     * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
     * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
     * own worker, you don't want it to do this.
     *
     * By setting this value to `true`, Prism will not add its own listeners to the worker.
     *
     * You obviously have to change this value before Prism executes. To do this, you can add an
     * empty Prism object into the global scope before loading the Prism script like this:
     *
     * ```js
     * window.Prism = window.Prism || {};
     * Prism.disableWorkerMessageHandler = true;
     * // Load Prism's script
     * ```
     *
     * @default false
     * @type {boolean}
     * @memberof Prism
     * @public
     */
    disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,

    /**
     * A namespace for utility methods.
     *
     * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
     * change or disappear at any time.
     *
     * @namespace
     * @memberof Prism
     */
    util: {
      encode: function encode(tokens: any) {
        if (tokens instanceof Token) {
          return new Token(tokens.type, encode(tokens.content), tokens.alias);
        } else if (Array.isArray(tokens)) {
          return tokens.map(encode);
        } else {
          return tokens
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/\u00a0/g, ' ');
        }
      },

      /**
       * Returns the name of the type of the given value.
       *
       * @param {any} o
       * @returns {string}
       * @example
       * type(null)      === 'Null'
       * type(undefined) === 'Undefined'
       * type(123)       === 'Number'
       * type('foo')     === 'String'
       * type(true)      === 'Boolean'
       * type([1, 2])    === 'Array'
       * type({})        === 'Object'
       * type(String)    === 'Function'
       * type(/abc+/)    === 'RegExp'
       */
      type: function (o) {
        return Object.prototype.toString.call(o).slice(8, -1);
      },

      /**
       * Returns a unique number for the given object. Later calls will still return the same number.
       *
       * @param {Object} obj
       * @returns {number}
       */
      objId: function (obj) {
        if (!obj['__id']) {
          Object.defineProperty(obj, '__id', { value: ++uniqueId });
        }
        return obj['__id'];
      },

      /**
       * Creates a deep clone of the given object.
       *
       * The main intended use of this function is to clone language definitions.
       *
       * @param {T} o
       * @param {Record<number, any>} [visited]
       * @returns {T}
       * @template T
       */
      clone: function deepClone(o, visited) {
        visited = visited || {};

        var clone;
        var id;
        switch (_.util.type(o)) {
          case 'Object':
            id = _.util.objId(o);
            if (visited[id]) {
              return visited[id];
            }
            clone = /** @type {Record<string, any>} */ {};
            visited[id] = clone;

            for (var key in o) {
              if (o.hasOwnProperty(key)) {
                clone[key] = deepClone(o[key], visited);
              }
            }

            return /** @type {any} */ clone;

          case 'Array':
            id = _.util.objId(o);
            if (visited[id]) {
              return visited[id];
            }
            clone = [];
            visited[id] = clone;

            /** @type {Array} */ /** @type {any} */ o.forEach(function (v, i) {
              clone[i] = deepClone(v, visited);
            });

            return /** @type {any} */ clone;

          default:
            return o;
        }
      },

      /**
       * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
       *
       * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
       *
       * @param {Element} element
       * @returns {string}
       */
      getLanguage: function (element) {
        while (element) {
          var m = lang.exec(element.className);
          if (m) {
            return m[1].toLowerCase();
          }
          element = element.parentElement;
        }
        return 'none';
      },

      /**
       * Sets the Prism `language-xxxx` class of the given element.
       *
       * @param {Element} element
       * @param {string} language
       * @returns {void}
       */
      setLanguage: function (element, language) {
        // remove all `language-xxxx` classes
        // (this might leave behind a leading space)
        element.className = element.className.replace(RegExp(lang, 'gi'), '');

        // add the new `language-xxxx` class
        // (using `classList` will automatically clean up spaces for us)
        element.classList.add('language-' + language);
      },

      /**
       * Returns the script element that is currently executing.
       *
       * This does __not__ work for line script element.
       *
       * @returns {HTMLScriptElement | null}
       */
      currentScript: function () {
        if (typeof document === 'undefined') {
          return null;
        }
        if ('currentScript' in document && 1 < 2 /* hack to trip TS' flow analysis */) {
          return /** @type {any} */ document.currentScript;
        }

        // IE11 workaround
        // we'll get the src of the current script by parsing IE11's error stack trace
        // this will not work for inline scripts

        try {
          throw new Error();
        } catch (err) {
          // Get file src url from stack. Specifically works with the format of stack traces in IE.
          // A stack will look like this:
          //
          // Error
          //    at _.util.currentScript (http://localhost/components/prism-core.js:119:5)
          //    at Global code (http://localhost/components/prism-core.js:606:1)

          var src = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(err.stack) || [])[1];
          if (src) {
            var scripts = document.getElementsByTagName('script');
            for (var i in scripts) {
              if (scripts[i].src == src) {
                return scripts[i];
              }
            }
          }
          return null;
        }
      },

      /**
       * Returns whether a given class is active for `element`.
       *
       * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
       * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
       * given class is just the given class with a `no-` prefix.
       *
       * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
       * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
       * ancestors have the given class or the negated version of it, then the default activation will be returned.
       *
       * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
       * version of it, the class is considered active.
       *
       * @param {Element} element
       * @param {string} className
       * @param {boolean} [defaultActivation=false]
       * @returns {boolean}
       */
      isActive: function (element, className, defaultActivation) {
        var no = 'no-' + className;

        while (element) {
          var classList = element.classList;
          if (classList.contains(className)) {
            return true;
          }
          if (classList.contains(no)) {
            return false;
          }
          element = element.parentElement;
        }
        return !!defaultActivation;
      },
    },

    /**
     * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
     *
     * @namespace
     * @memberof Prism
     * @public
     */
    languages: {
      /**
       * The grammar for plain, unformatted text.
       */
      plain: plainTextGrammar,
      plaintext: plainTextGrammar,
      text: plainTextGrammar,
      txt: plainTextGrammar,

      /**
       * Creates a deep copy of the language with the given id and appends the given tokens.
       *
       * If a token in `redef` also appears in the copied language, then the existing token in the copied language
       * will be overwritten at its original position.
       *
       * ## Best practices
       *
       * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
       * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
       * understand the language definition because, normally, the order of tokens matters in Prism grammars.
       *
       * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
       * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
       *
       * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
       * @param {Grammar} redef The new tokens to append.
       * @returns {Grammar} The new language created.
       * @public
       * @example
       * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
       *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
       *     // at its original position
       *     'comment': { ... },
       *     // CSS doesn't have a 'color' token, so this token will be appended
       *     'color': /\b(?:red|green|blue)\b/
       * });
       */
      extend: function (id, redef) {
        var lang = _.util.clone(_.languages[id]);

        for (var key in redef) {
          lang[key] = redef[key];
        }

        return lang;
      },

      /**
       * Inserts tokens _before_ another token in a language definition or any other grammar.
       *
       * ## Usage
       *
       * This helper method makes it easy to modify existing languages. For example, the CSS language definition
       * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
       * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
       * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
       * this:
       *
       * ```js
       * Prism.languages.markup.style = {
       *     // token
       * };
       * ```
       *
       * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
       * before existing tokens. For the CSS example above, you would use it like this:
       *
       * ```js
       * Prism.languages.insertBefore('markup', 'cdata', {
       *     'style': {
       *         // token
       *     }
       * });
       * ```
       *
       * ## Special cases
       *
       * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
       * will be ignored.
       *
       * This behavior can be used to insert tokens after `before`:
       *
       * ```js
       * Prism.languages.insertBefore('markup', 'comment', {
       *     'comment': Prism.languages.markup.comment,
       *     // tokens after 'comment'
       * });
       * ```
       *
       * ## Limitations
       *
       * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
       * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
       * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
       * deleting properties which is necessary to insert at arbitrary positions.
       *
       * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
       * Instead, it will create a new object and replace all references to the target object with the new one. This
       * can be done without temporarily deleting properties, so the iteration order is well-defined.
       *
       * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
       * you hold the target object in a variable, then the value of the variable will not change.
       *
       * ```js
       * var oldMarkup = Prism.languages.markup;
       * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
       *
       * assert(oldMarkup !== Prism.languages.markup);
       * assert(newMarkup === Prism.languages.markup);
       * ```
       *
       * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
       * object to be modified.
       * @param {string} before The key to insert before.
       * @param {Grammar} insert An object containing the key-value pairs to be inserted.
       * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
       * object to be modified.
       *
       * Defaults to `Prism.languages`.
       * @returns {Grammar} The new grammar object.
       * @public
       */
      insertBefore: function (inside, before, insert, root) {
        root = root || /** @type {any} */ _.languages;
        var grammar = root[inside];
        /** @type {Grammar} */
        var ret = {};

        for (var token in grammar) {
          if (grammar.hasOwnProperty(token)) {
            if (token == before) {
              for (var newToken in insert) {
                if (insert.hasOwnProperty(newToken)) {
                  ret[newToken] = insert[newToken];
                }
              }
            }

            // Do not insert token which also occur in insert. See #1525
            if (!insert.hasOwnProperty(token)) {
              ret[token] = grammar[token];
            }
          }
        }

        var old = root[inside];
        root[inside] = ret;

        // Update references in other language definitions
        _.languages.DFS(_.languages, function (key, value) {
          if (value === old && key != inside) {
            this[key] = ret;
          }
        });

        return ret;
      },

      // Traverse a language definition with Depth First Search
      DFS: function DFS(o, callback, type, visited) {
        visited = visited || {};

        var objId = _.util.objId;

        for (var i in o) {
          if (o.hasOwnProperty(i)) {
            callback.call(o, i, o[i], type || i);

            var property = o[i];
            var propertyType = _.util.type(property);

            if (propertyType === 'Object' && !visited[objId(property)]) {
              visited[objId(property)] = true;
              DFS(property, callback, null, visited);
            } else if (propertyType === 'Array' && !visited[objId(property)]) {
              visited[objId(property)] = true;
              DFS(property, callback, i, visited);
            }
          }
        }
      },
    },

    plugins: {},

    /**
     * This is the most high-level function in Prism’s API.
     * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
     * each one of them.
     *
     * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
     *
     * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
     * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
     * @memberof Prism
     * @public
     */
    highlightAll: function (async, callback) {
      _.highlightAllUnder(document, async, callback);
    },

    /**
     * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
     * {@link Prism.highlightElement} on each one of them.
     *
     * The following hooks will be run:
     * 1. `before-highlightall`
     * 2. `before-all-elements-highlight`
     * 3. All hooks of {@link Prism.highlightElement} for each element.
     *
     * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
     * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
     * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
     * @memberof Prism
     * @public
     */
    highlightAllUnder: function (container, async, callback) {
      var env = {
        callback: callback,
        container: container,
        selector:
          'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code',
      };

      _.hooks.run('before-highlightall', env);

      env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));

      _.hooks.run('before-all-elements-highlight', env);

      for (var i = 0, element; (element = env.elements[i++]); ) {
        _.highlightElement(element, async === true, env.callback);
      }
    },

    /**
     * Highlights the code inside a single element.
     *
     * The following hooks will be run:
     * 1. `before-sanity-check`
     * 2. `before-highlight`
     * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
     * 4. `before-insert`
     * 5. `after-highlight`
     * 6. `complete`
     *
     * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
     * the element's language.
     *
     * @param {Element} element The element containing the code.
     * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
     * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
     * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
     * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
     *
     * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
     * asynchronous highlighting to work. You can build your own bundle on the
     * [Download page](https://prismjs.com/download.html).
     * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
     * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
     * @memberof Prism
     * @public
     */
    highlightElement: function (element, async, callback) {
      // Find language
      var language = _.util.getLanguage(element);
      var grammar = _.languages[language];

      // Set language on the element, if not present
      _.util.setLanguage(element, language);

      // Set language on the parent, for styling
      var parent = element.parentElement;
      if (parent && parent.nodeName.toLowerCase() === 'pre') {
        _.util.setLanguage(parent, language);
      }

      var code = element.textContent;

      var env = {
        element: element,
        language: language,
        grammar: grammar,
        code: code,
      };

      function insertHighlightedCode(highlightedCode) {
        env.highlightedCode = highlightedCode;

        _.hooks.run('before-insert', env);

        env.element.innerHTML = env.highlightedCode;

        _.hooks.run('after-highlight', env);
        _.hooks.run('complete', env);
        callback && callback.call(env.element);
      }

      _.hooks.run('before-sanity-check', env);

      // plugins may change/add the parent/element
      parent = env.element.parentElement;
      if (parent && parent.nodeName.toLowerCase() === 'pre' && !parent.hasAttribute('tabindex')) {
        parent.setAttribute('tabindex', '0');
      }

      if (!env.code) {
        _.hooks.run('complete', env);
        callback && callback.call(env.element);
        return;
      }

      _.hooks.run('before-highlight', env);

      if (!env.grammar) {
        insertHighlightedCode(_.util.encode(env.code));
        return;
      }

      if (async && _self.Worker) {
        var worker = new Worker(_.filename);

        worker.onmessage = function (evt) {
          insertHighlightedCode(evt.data);
        };

        worker.postMessage(
          JSON.stringify({
            language: env.language,
            code: env.code,
            immediateClose: true,
          })
        );
      } else {
        insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
      }
    },

    /**
     * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
     * and the language definitions to use, and returns a string with the HTML produced.
     *
     * The following hooks will be run:
     * 1. `before-tokenize`
     * 2. `after-tokenize`
     * 3. `wrap`: On each {@link Token}.
     *
     * @param {string} text A string with the code to be highlighted.
     * @param {Grammar} grammar An object containing the tokens to use.
     *
     * Usually a language definition like `Prism.languages.markup`.
     * @param {string} language The name of the language definition passed to `grammar`.
     * @returns {string} The highlighted HTML.
     * @memberof Prism
     * @public
     * @example
     * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
     */
    highlight: function (text, grammar, language) {
      var env = {
        code: text,
        grammar: grammar,
        language: language,
      };
      _.hooks.run('before-tokenize', env);
      if (!env.grammar) {
        throw new Error('The language "' + env.language + '" has no grammar.');
      }
      env.tokens = _.tokenize(env.code, env.grammar);
      _.hooks.run('after-tokenize', env);
      return Token.stringify(_.util.encode(env.tokens), env.language);
    },

    /**
     * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
     * and the language definitions to use, and returns an array with the tokenized code.
     *
     * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
     *
     * This method could be useful in other contexts as well, as a very crude parser.
     *
     * @param {string} text A string with the code to be highlighted.
     * @param {Grammar} grammar An object containing the tokens to use.
     *
     * Usually a language definition like `Prism.languages.markup`.
     * @returns {TokenStream} An array of strings and tokens, a token stream.
     * @memberof Prism
     * @public
     * @example
     * let code = `var foo = 0;`;
     * let tokens = Prism.tokenize(code, Prism.languages.javascript);
     * tokens.forEach(token => {
     *     if (token instanceof Prism.Token && token.type === 'number') {
     *         console.log(`Found numeric literal: ${token.content}`);
     *     }
     * });
     */
    tokenize: function (text, grammar) {
      var rest = grammar.rest;
      if (rest) {
        for (var token in rest) {
          grammar[token] = rest[token];
        }

        delete grammar.rest;
      }

      var tokenList = new LinkedList();
      addAfter(tokenList, tokenList.head, text);

      matchGrammar(text, tokenList, grammar, tokenList.head, 0);

      return toArray(tokenList);
    },

    /**
     * @namespace
     * @memberof Prism
     * @public
     */
    hooks: {
      all: {},

      /**
       * Adds the given callback to the list of callbacks for the given hook.
       *
       * The callback will be invoked when the hook it is registered for is run.
       * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
       *
       * One callback function can be registered to multiple hooks and the same hook multiple times.
       *
       * @param {string} name The name of the hook.
       * @param {HookCallback} callback The callback function which is given environment variables.
       * @public
       */
      add: function (name, callback) {
        var hooks = _.hooks.all;

        hooks[name] = hooks[name] || [];

        hooks[name].push(callback);
      },

      /**
       * Runs a hook invoking all registered callbacks with the given environment variables.
       *
       * Callbacks will be invoked synchronously and in the order in which they were registered.
       *
       * @param {string} name The name of the hook.
       * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
       * @public
       */
      run: function (name, env) {
        var callbacks = _.hooks.all[name];

        if (!callbacks || !callbacks.length) {
          return;
        }

        for (var i = 0, callback; (callback = callbacks[i++]); ) {
          callback(env);
        }
      },
    },

    Token: Token,
  };
  _self.Prism = _;

  // Typescript note:
  // The following can be used to import the Token type in JSDoc:
  //
  //   @typedef {InstanceType<import("./prism-core")["Token"]>} Token

  /**
   * Creates a new token.
   *
   * @param {string} type See {@link Token#type type}
   * @param {string | TokenStream} content See {@link Token#content content}
   * @param {string|string[]} [alias] The alias(es) of the token.
   * @param {string} [matchedStr=""] A copy of the full string this token was created from.
   * @class
   * @global
   * @public
   */
  function Token(type, content, alias, matchedStr) {
    /**
     * The type of the token.
     *
     * This is usually the key of a pattern in a {@link Grammar}.
     *
     * @type {string}
     * @see GrammarToken
     * @public
     */
    this.type = type;
    /**
     * The strings or tokens contained by this token.
     *
     * This will be a token stream if the pattern matched also defined an `inside` grammar.
     *
     * @type {string | TokenStream}
     * @public
     */
    this.content = content;
    /**
     * The alias(es) of the token.
     *
     * @type {string|string[]}
     * @see GrammarToken
     * @public
     */
    this.alias = alias;
    // Copy of the full string this token was created from
    this.length = (matchedStr || '').length | 0;
  }

  /**
   * A token stream is an array of strings and {@link Token Token} objects.
   *
   * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
   * them.
   *
   * 1. No adjacent strings.
   * 2. No empty strings.
   *
   *    The only exception here is the token stream that only contains the empty string and nothing else.
   *
   * @typedef {Array<string | Token>} TokenStream
   * @global
   * @public
   */

  /**
   * Converts the given token or token stream to an HTML representation.
   *
   * The following hooks will be run:
   * 1. `wrap`: On each {@link Token}.
   *
   * @param {string | Token | TokenStream} o The token or token stream to be converted.
   * @param {string} language The name of current language.
   * @returns {string} The HTML representation of the token or token stream.
   * @memberof Token
   * @static
   */
  Token.stringify = function stringify(o, language) {
    if (typeof o == 'string') {
      return o;
    }
    if (Array.isArray(o)) {
      var s = '';
      o.forEach(function (e) {
        s += stringify(e, language);
      });
      return s;
    }

    var env = {
      type: o.type,
      content: stringify(o.content, language),
      tag: 'span',
      classes: ['token', o.type],
      attributes: {},
      language: language,
    };

    var aliases = o.alias;
    if (aliases) {
      if (Array.isArray(aliases)) {
        Array.prototype.push.apply(env.classes, aliases);
      } else {
        env.classes.push(aliases);
      }
    }

    _.hooks.run('wrap', env);

    var attributes = '';
    for (var name in env.attributes) {
      attributes += ' ' + name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
    }

    return (
      '<' +
      env.tag +
      ' class="' +
      env.classes.join(' ') +
      '"' +
      attributes +
      '>' +
      env.content +
      '</' +
      env.tag +
      '>'
    );
  };

  /**
   * @param {RegExp} pattern
   * @param {number} pos
   * @param {string} text
   * @param {boolean} lookbehind
   * @returns {RegExpExecArray | null}
   */
  function matchPattern(pattern, pos, text, lookbehind) {
    pattern.lastIndex = pos;
    var match = pattern.exec(text);
    if (match && lookbehind && match[1]) {
      // change the match to remove the text matched by the Prism lookbehind group
      var lookbehindLength = match[1].length;
      match.index += lookbehindLength;
      match[0] = match[0].slice(lookbehindLength);
    }
    return match;
  }

  /**
   * @param {string} text
   * @param {LinkedList<string | Token>} tokenList
   * @param {any} grammar
   * @param {LinkedListNode<string | Token>} startNode
   * @param {number} startPos
   * @param {RematchOptions} [rematch]
   * @returns {void}
   * @private
   *
   * @typedef RematchOptions
   * @property {string} cause
   * @property {number} reach
   */
  function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
    for (var token in grammar) {
      if (!grammar.hasOwnProperty(token) || !grammar[token]) {
        continue;
      }

      var patterns = grammar[token];
      patterns = Array.isArray(patterns) ? patterns : [patterns];

      for (var j = 0; j < patterns.length; ++j) {
        if (rematch && rematch.cause == token + ',' + j) {
          return;
        }

        var patternObj = patterns[j];
        var inside = patternObj.inside;
        var lookbehind = !!patternObj.lookbehind;
        var greedy = !!patternObj.greedy;
        var alias = patternObj.alias;

        if (greedy && !patternObj.pattern.global) {
          // Without the global flag, lastIndex won't work
          var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
          patternObj.pattern = RegExp(patternObj.pattern.source, flags + 'g');
        }

        /** @type {RegExp} */
        var pattern = patternObj.pattern || patternObj;

        for (
          // iterate the token list and keep track of the current token/string position
          var currentNode = startNode.next, pos = startPos;
          currentNode !== tokenList.tail;
          pos += currentNode.value.length, currentNode = currentNode.next
        ) {
          if (rematch && pos >= rematch.reach) {
            break;
          }

          var str = currentNode.value;

          if (tokenList.length > text.length) {
            // Something went terribly wrong, ABORT, ABORT!
            return;
          }

          if (str instanceof Token) {
            continue;
          }

          var removeCount = 1; // this is the to parameter of removeBetween
          var match;

          if (greedy) {
            match = matchPattern(pattern, pos, text, lookbehind);
            if (!match || match.index >= text.length) {
              break;
            }

            var from = match.index;
            var to = match.index + match[0].length;
            var p = pos;

            // find the node that contains the match
            p += currentNode.value.length;
            while (from >= p) {
              currentNode = currentNode.next;
              p += currentNode.value.length;
            }
            // adjust pos (and p)
            p -= currentNode.value.length;
            pos = p;

            // the current node is a Token, then the match starts inside another Token, which is invalid
            if (currentNode.value instanceof Token) {
              continue;
            }

            // find the last node which is affected by this match
            for (
              var k = currentNode;
              k !== tokenList.tail && (p < to || typeof k.value === 'string');
              k = k.next
            ) {
              removeCount++;
              p += k.value.length;
            }
            removeCount--;

            // replace with the new match
            str = text.slice(pos, p);
            match.index -= pos;
          } else {
            match = matchPattern(pattern, 0, str, lookbehind);
            if (!match) {
              continue;
            }
          }

          // eslint-disable-next-line no-redeclare
          var from = match.index;
          var matchStr = match[0];
          var before = str.slice(0, from);
          var after = str.slice(from + matchStr.length);

          var reach = pos + str.length;
          if (rematch && reach > rematch.reach) {
            rematch.reach = reach;
          }

          var removeFrom = currentNode.prev;

          if (before) {
            removeFrom = addAfter(tokenList, removeFrom, before);
            pos += before.length;
          }

          removeRange(tokenList, removeFrom, removeCount);

          var wrapped = new Token(
            token,
            inside ? _.tokenize(matchStr, inside) : matchStr,
            alias,
            matchStr
          );
          currentNode = addAfter(tokenList, removeFrom, wrapped);

          if (after) {
            addAfter(tokenList, currentNode, after);
          }

          if (removeCount > 1) {
            // at least one Token object was removed, so we have to do some rematching
            // this can only happen if the current pattern is greedy

            /** @type {RematchOptions} */
            var nestedRematch = {
              cause: token + ',' + j,
              reach: reach,
            };
            matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);

            // the reach might have been extended because of the rematching
            if (rematch && nestedRematch.reach > rematch.reach) {
              rematch.reach = nestedRematch.reach;
            }
          }
        }
      }
    }
  }

  /**
   * @typedef LinkedListNode
   * @property {T} value
   * @property {LinkedListNode<T> | null} prev The previous node.
   * @property {LinkedListNode<T> | null} next The next node.
   * @template T
   * @private
   */

  /**
   * @template T
   * @private
   */
  function LinkedList() {
    /** @type {LinkedListNode<T>} */
    var head = { value: null, prev: null, next: null };
    /** @type {LinkedListNode<T>} */
    var tail = { value: null, prev: head, next: null };
    head.next = tail;

    /** @type {LinkedListNode<T>} */
    this.head = head;
    /** @type {LinkedListNode<T>} */
    this.tail = tail;
    this.length = 0;
  }

  /**
   * Adds a new node with the given value to the list.
   *
   * @param {LinkedList<T>} list
   * @param {LinkedListNode<T>} node
   * @param {T} value
   * @returns {LinkedListNode<T>} The added node.
   * @template T
   */
  function addAfter(list, node, value) {
    // assumes that node != list.tail && values.length >= 0
    var next = node.next;

    var newNode = { value: value, prev: node, next: next };
    node.next = newNode;
    next.prev = newNode;
    list.length++;

    return newNode;
  }
  /**
   * Removes `count` nodes after the given node. The given node will not be removed.
   *
   * @param {LinkedList<T>} list
   * @param {LinkedListNode<T>} node
   * @param {number} count
   * @template T
   */
  function removeRange(list, node, count) {
    var next = node.next;
    for (var i = 0; i < count && next !== list.tail; i++) {
      next = next.next;
    }
    node.next = next;
    next.prev = node;
    list.length -= i;
  }
  /**
   * @param {LinkedList<T>} list
   * @returns {T[]}
   * @template T
   */
  function toArray(list) {
    var array = [];
    var node = list.head.next;
    while (node !== list.tail) {
      array.push(node.value);
      node = node.next;
    }
    return array;
  }

  if (!_self.document) {
    if (!_self.addEventListener) {
      // in Node.js
      return _;
    }

    if (!_.disableWorkerMessageHandler) {
      // In worker
      _self.addEventListener(
        'message',
        function (evt) {
          var message = JSON.parse(evt.data);
          var lang = message.language;
          var code = message.code;
          var immediateClose = message.immediateClose;

          _self.postMessage(_.highlight(code, _.languages[lang], lang));
          if (immediateClose) {
            _self.close();
          }
        },
        false
      );
    }

    return _;
  }

  // Get current script and highlight
  var script = _.util.currentScript();

  if (script) {
    _.filename = script.src;

    if (script.hasAttribute('data-manual')) {
      _.manual = true;
    }
  }

  function highlightAutomaticallyCallback() {
    if (!_.manual) {
      _.highlightAll();
    }
  }

  if (!_.manual) {
    // If the document state is "loading", then we'll use DOMContentLoaded.
    // If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
    // DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
    // might take longer one animation frame to execute which can create a race condition where only some plugins have
    // been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
    // See https://github.com/PrismJS/prism/issues/2102
    var readyState = document.readyState;
    if (readyState === 'loading' || (readyState === 'interactive' && script && script.defer)) {
      document.addEventListener('DOMContentLoaded', highlightAutomaticallyCallback);
    } else {
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(highlightAutomaticallyCallback);
      } else {
        window.setTimeout(highlightAutomaticallyCallback, 16);
      }
    }
  }

  return _;
})(_self);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
  global.Prism = Prism;
}

// some additional documentation/types

/**
 * The expansion of a simple `RegExp` literal to support additional properties.
 *
 * @typedef GrammarToken
 * @property {RegExp} pattern The regular expression of the token.
 * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
 * @property {boolean} [greedy=false] Whether the token is greedy.
 * @property {string|string[]} [alias] An optional alias or list of aliases.
 * @property {Grammar} [inside] The nested grammar of this token.
 *
 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
 *
 * This can be used to make nested and even recursive language definitions.
 *
 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
 * each another.
 * @global
 * @public
 */

/**
 * @typedef Grammar
 * @type {Object<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>}
 * @property {Grammar} [rest] An optional grammar object that will be appended to this grammar.
 * @global
 * @public
 */

/**
 * A function which will invoked after an element was successfully highlighted.
 *
 * @callback HighlightCallback
 * @param {Element} element The element successfully highlighted.
 * @returns {void}
 * @global
 * @public
 */

/**
 * @callback HookCallback
 * @param {Object<string, any>} env The environment variables of the hook.
 * @returns {void}
 * @global
 * @public
 */
Prism.languages.markup = {
  comment: {
    pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
    greedy: true,
  },
  prolog: {
    pattern: /<\?[\s\S]+?\?>/,
    greedy: true,
  },
  doctype: {
    // https://www.w3.org/TR/xml/#NT-doctypedecl
    pattern:
      /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
    greedy: true,
    inside: {
      'internal-subset': {
        pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
        lookbehind: true,
        greedy: true,
        inside: null, // see below
      },
      string: {
        pattern: /"[^"]*"|'[^']*'/,
        greedy: true,
      },
      punctuation: /^<!|>$|[[\]]/,
      'doctype-tag': /^DOCTYPE/i,
      name: /[^\s<>'"]+/,
    },
  },
  cdata: {
    pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
    greedy: true,
  },
  tag: {
    pattern:
      /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
    greedy: true,
    inside: {
      tag: {
        pattern: /^<\/?[^\s>\/]+/,
        inside: {
          punctuation: /^<\/?/,
          namespace: /^[^\s>\/:]+:/,
        },
      },
      'special-attr': [],
      'attr-value': {
        pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
        inside: {
          punctuation: [
            {
              pattern: /^=/,
              alias: 'attr-equals',
            },
            {
              pattern: /^(\s*)["']|["']$/,
              lookbehind: true,
            },
          ],
        },
      },
      punctuation: /\/?>/,
      'attr-name': {
        pattern: /[^\s>\/]+/,
        inside: {
          namespace: /^[^\s>\/:]+:/,
        },
      },
    },
  },
  entity: [
    {
      pattern: /&[\da-z]{1,8};/i,
      alias: 'named-entity',
    },
    /&#x?[\da-f]{1,8};/i,
  ],
};

Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
  Prism.languages.markup['entity'];
Prism.languages.markup['doctype'].inside['internal-subset'].inside = Prism.languages.markup;

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function (env) {
  if (env.type === 'entity') {
    env.attributes['title'] = env.content.replace(/&amp;/, '&');
  }
});

Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
  /**
   * Adds an inlined language to markup.
   *
   * An example of an inlined language is CSS with `<style>` tags.
   *
   * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
   * case insensitive.
   * @param {string} lang The language key.
   * @example
   * addInlined('style', 'css');
   */
  value: function addInlined(tagName, lang) {
    var includedCdataInside = {};
    includedCdataInside['language-' + lang] = {
      pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
      lookbehind: true,
      inside: Prism.languages[lang],
    };
    includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

    var inside = {
      'included-cdata': {
        pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
        inside: includedCdataInside,
      },
    };
    inside['language-' + lang] = {
      pattern: /[\s\S]+/,
      inside: Prism.languages[lang],
    };

    var def = {};
    def[tagName] = {
      pattern: RegExp(
        /(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(
          /__/g,
          function () {
            return tagName;
          }
        ),
        'i'
      ),
      lookbehind: true,
      greedy: true,
      inside: inside,
    };

    Prism.languages.insertBefore('markup', 'cdata', def);
  },
});
Object.defineProperty(Prism.languages.markup.tag, 'addAttribute', {
  /**
   * Adds an pattern to highlight languages embedded in HTML attributes.
   *
   * An example of an inlined language is CSS with `style` attributes.
   *
   * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
   * case insensitive.
   * @param {string} lang The language key.
   * @example
   * addAttribute('style', 'css');
   */
  value: function (attrName, lang) {
    Prism.languages.markup.tag.inside['special-attr'].push({
      pattern: RegExp(
        /(^|["'\s])/.source +
          '(?:' +
          attrName +
          ')' +
          /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
        'i'
      ),
      lookbehind: true,
      inside: {
        'attr-name': /^[^\s=]+/,
        'attr-value': {
          pattern: /=[\s\S]+/,
          inside: {
            value: {
              pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
              lookbehind: true,
              alias: [lang, 'language-' + lang],
              inside: Prism.languages[lang],
            },
            punctuation: [
              {
                pattern: /^=/,
                alias: 'attr-equals',
              },
              /"|'/,
            ],
          },
        },
      },
    });
  },
});

Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.xml = Prism.languages.extend('markup', {});
Prism.languages.ssml = Prism.languages.xml;
Prism.languages.atom = Prism.languages.xml;
Prism.languages.rss = Prism.languages.xml;

(function (Prism) {
  var string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;

  Prism.languages.css = {
    comment: /\/\*[\s\S]*?\*\//,
    atrule: {
      pattern: RegExp(
        '@[\\w-](?:' +
          /[^;{\s"']|\s+(?!\s)/.source +
          '|' +
          string.source +
          ')*?' +
          /(?:;|(?=\s*\{))/.source
      ),
      inside: {
        rule: /^@[\w-]+/,
        'selector-function-argument': {
          pattern:
            /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
          lookbehind: true,
          alias: 'selector',
        },
        keyword: {
          pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
          lookbehind: true,
        },
        // See rest below
      },
    },
    url: {
      // https://drafts.csswg.org/css-values-3/#urls
      pattern: RegExp(
        '\\burl\\((?:' + string.source + '|' + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ')\\)',
        'i'
      ),
      greedy: true,
      inside: {
        function: /^url/i,
        punctuation: /^\(|\)$/,
        string: {
          pattern: RegExp('^' + string.source + '$'),
          alias: 'url',
        },
      },
    },
    selector: {
      pattern: RegExp(
        '(^|[{}\\s])[^{}\\s](?:[^{};"\'\\s]|\\s+(?![\\s{])|' + string.source + ')*(?=\\s*\\{)'
      ),
      lookbehind: true,
    },
    string: {
      pattern: string,
      greedy: true,
    },
    property: {
      pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
      lookbehind: true,
    },
    important: /!important\b/i,
    function: {
      pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
      lookbehind: true,
    },
    punctuation: /[(){};:,]/,
  };

  Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

  var markup = Prism.languages.markup;
  if (markup) {
    markup.tag.addInlined('style', 'css');
    markup.tag.addAttribute('style', 'css');
  }
})(Prism);

Prism.languages.clike = {
  comment: [
    {
      pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
      lookbehind: true,
      greedy: true,
    },
    {
      pattern: /(^|[^\\:])\/\/.*/,
      lookbehind: true,
      greedy: true,
    },
  ],
  string: {
    pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true,
  },
  'class-name': {
    pattern:
      /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
    lookbehind: true,
    inside: {
      punctuation: /[.\\]/,
    },
  },
  keyword:
    /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
  boolean: /\b(?:false|true)\b/,
  function: /\b\w+(?=\()/,
  number: /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
  operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
  punctuation: /[{}[\];(),.:]/,
};

Prism.languages.javascript = Prism.languages.extend('clike', {
  'class-name': [
    Prism.languages.clike['class-name'],
    {
      pattern:
        /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
      lookbehind: true,
    },
  ],
  keyword: [
    {
      pattern: /((?:^|\})\s*)catch\b/,
      lookbehind: true,
    },
    {
      pattern:
        /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
      lookbehind: true,
    },
  ],
  // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
  function:
    /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
  number: {
    pattern: RegExp(
      /(^|[^\w$])/.source +
        '(?:' +
        // constant
        (/NaN|Infinity/.source +
          '|' +
          // binary integer
          /0[bB][01]+(?:_[01]+)*n?/.source +
          '|' +
          // octal integer
          /0[oO][0-7]+(?:_[0-7]+)*n?/.source +
          '|' +
          // hexadecimal integer
          /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source +
          '|' +
          // decimal bigint
          /\d+(?:_\d+)*n/.source +
          '|' +
          // decimal number (integer or float) but no bigint
          /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/
            .source) +
        ')' +
        /(?![\w$])/.source
    ),
    lookbehind: true,
  },
  operator:
    /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/,
});

Prism.languages.javascript['class-name'][0].pattern =
  /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;

Prism.languages.insertBefore('javascript', 'keyword', {
  regex: {
    pattern: RegExp(
      // lookbehind
      // eslint-disable-next-line regexp/no-dupe-characters-character-class
      /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source +
        // Regex pattern:
        // There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
        // classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
        // with the only syntax, so we have to define 2 different regex patterns.
        /\//.source +
        '(?:' +
        /(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source +
        '|' +
        // `v` flag syntax. This supports 3 levels of nested character classes.
        /(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/
          .source +
        ')' +
        // lookahead
        /(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
    ),
    lookbehind: true,
    greedy: true,
    inside: {
      'regex-source': {
        pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
        lookbehind: true,
        alias: 'language-regex',
        inside: Prism.languages.regex,
      },
      'regex-delimiter': /^\/|\/$/,
      'regex-flags': /^[a-z]+$/,
    },
  },
  // This must be declared before keyword because we use "function" inside the look-forward
  'function-variable': {
    pattern:
      /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
    alias: 'function',
  },
  parameter: [
    {
      pattern:
        /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
    {
      pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
    {
      pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
    {
      pattern:
        /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
  ],
  constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/,
});

Prism.languages.insertBefore('javascript', 'string', {
  hashbang: {
    pattern: /^#!.*/,
    greedy: true,
    alias: 'comment',
  },
  'template-string': {
    pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
    greedy: true,
    inside: {
      'template-punctuation': {
        pattern: /^`|`$/,
        alias: 'string',
      },
      interpolation: {
        pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
        lookbehind: true,
        inside: {
          'interpolation-punctuation': {
            pattern: /^\$\{|\}$/,
            alias: 'punctuation',
          },
          rest: Prism.languages.javascript,
        },
      },
      string: /[\s\S]+/,
    },
  },
  'string-property': {
    pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
    lookbehind: true,
    greedy: true,
    alias: 'property',
  },
});

Prism.languages.insertBefore('javascript', 'operator', {
  'literal-property': {
    pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
    lookbehind: true,
    alias: 'property',
  },
});

if (Prism.languages.markup) {
  Prism.languages.markup.tag.addInlined('script', 'javascript');

  // add attribute support for all DOM events.
  // https://developer.mozilla.org/en-US/docs/Web/Events#Standard_events
  Prism.languages.markup.tag.addAttribute(
    /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/
      .source,
    'javascript'
  );
}

Prism.languages.js = Prism.languages.javascript;

Prism.languages.armasm = {
  comment: {
    pattern: /;.*/,
    greedy: true,
  },
  string: {
    pattern: /"(?:[^"\r\n]|"")*"/,
    greedy: true,
    inside: {
      variable: {
        pattern: /((?:^|[^$])(?:\${2})*)\$\w+/,
        lookbehind: true,
      },
    },
  },
  char: {
    pattern: /'(?:[^'\r\n]{0,4}|'')'/,
    greedy: true,
  },
  'version-symbol': {
    pattern: /\|[\w@]+\|/,
    greedy: true,
    alias: 'property',
  },

  boolean: /\b(?:FALSE|TRUE)\b/,
  directive: {
    pattern:
      /\b(?:ALIAS|ALIGN|AREA|ARM|ASSERT|ATTR|CN|CODE|CODE16|CODE32|COMMON|CP|DATA|DCB|DCD|DCDO|DCDU|DCFD|DCFDU|DCI|DCQ|DCQU|DCW|DCWU|DN|ELIF|ELSE|END|ENDFUNC|ENDIF|ENDP|ENTRY|EQU|EXPORT|EXPORTAS|EXTERN|FIELD|FILL|FN|FUNCTION|GBLA|GBLL|GBLS|GET|GLOBAL|IF|IMPORT|INCBIN|INCLUDE|INFO|KEEP|LCLA|LCLL|LCLS|LTORG|MACRO|MAP|MEND|MEXIT|NOFP|OPT|PRESERVE8|PROC|QN|READONLY|RELOC|REQUIRE|REQUIRE8|RLIST|ROUT|SETA|SETL|SETS|SN|SPACE|SUBT|THUMB|THUMBX|TTL|WEND|WHILE)\b/,
    alias: 'property',
  },
  instruction: {
    pattern:
      /((?:^|(?:^|[^\\])(?:\r\n?|\n))[ \t]*(?:(?:[A-Z][A-Z0-9_]*[a-z]\w*|[a-z]\w*|\d+)[ \t]+)?)\b[A-Z.]+\b/,
    lookbehind: true,
    alias: 'keyword',
  },
  variable: /\$\w+/,

  number:
    /(?:\b[2-9]_\d+|(?:\b\d+(?:\.\d+)?|\B\.\d+)(?:e-?\d+)?|\b0(?:[fd]_|x)[0-9a-f]+|&[0-9a-f]+)\b/i,

  register: {
    pattern: /\b(?:r\d|lr)\b/,
    alias: 'symbol',
  },

  operator: /<>|<<|>>|&&|\|\||[=!<>/]=?|[+\-*%#?&|^]|:[A-Z]+:/,
  punctuation: /[()[\],]/,
};

Prism.languages['arm-asm'] = Prism.languages.armasm;

(function (Prism) {
  // $ set | grep '^[A-Z][^[:space:]]*=' | cut -d= -f1 | tr '\n' '|'
  // + LC_ALL, RANDOM, REPLY, SECONDS.
  // + make sure PS1..4 are here as they are not always set,
  // - some useless things.
  var envVars =
    '\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b';

  var commandAfterHeredoc = {
    pattern: /(^(["']?)\w+\2)[ \t]+\S.*/,
    lookbehind: true,
    alias: 'punctuation', // this looks reasonably well in all themes
    inside: null, // see below
  };

  var insideString = {
    bash: commandAfterHeredoc,
    environment: {
      pattern: RegExp('\\$' + envVars),
      alias: 'constant',
    },
    variable: [
      // [0]: Arithmetic Environment
      {
        pattern: /\$?\(\([\s\S]+?\)\)/,
        greedy: true,
        inside: {
          // If there is a $ sign at the beginning highlight $(( and )) as variable
          variable: [
            {
              pattern: /(^\$\(\([\s\S]+)\)\)/,
              lookbehind: true,
            },
            /^\$\(\(/,
          ],
          number: /\b0x[\dA-Fa-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee]-?\d+)?/,
          // Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
          operator: /--|\+\+|\*\*=?|<<=?|>>=?|&&|\|\||[=!+\-*/%<>^&|]=?|[?~:]/,
          // If there is no $ sign at the beginning highlight (( and )) as punctuation
          punctuation: /\(\(?|\)\)?|,|;/,
        },
      },
      // [1]: Command Substitution
      {
        pattern: /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
        greedy: true,
        inside: {
          variable: /^\$\(|^`|\)$|`$/,
        },
      },
      // [2]: Brace expansion
      {
        pattern: /\$\{[^}]+\}/,
        greedy: true,
        inside: {
          operator: /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
          punctuation: /[\[\]]/,
          environment: {
            pattern: RegExp('(\\{)' + envVars),
            lookbehind: true,
            alias: 'constant',
          },
        },
      },
      /\$(?:\w+|[#?*!@$])/,
    ],
    // Escape sequences from echo and printf's manuals, and escaped quotes.
    entity: /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|U[0-9a-fA-F]{8}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,2})/,
  };

  Prism.languages.bash = {
    shebang: {
      pattern: /^#!\s*\/.*/,
      alias: 'important',
    },
    comment: {
      pattern: /(^|[^"{\\$])#.*/,
      lookbehind: true,
    },
    'function-name': [
      // a) function foo {
      // b) foo() {
      // c) function foo() {
      // but not “foo {”
      {
        // a) and c)
        pattern: /(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/,
        lookbehind: true,
        alias: 'function',
      },
      {
        // b)
        pattern: /\b[\w-]+(?=\s*\(\s*\)\s*\{)/,
        alias: 'function',
      },
    ],
    // Highlight variable names as variables in for and select beginnings.
    'for-or-select': {
      pattern: /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
      alias: 'variable',
      lookbehind: true,
    },
    // Highlight variable names as variables in the left-hand part
    // of assignments (“=” and “+=”).
    'assign-left': {
      pattern: /(^|[\s;|&]|[<>]\()\w+(?:\.\w+)*(?=\+?=)/,
      inside: {
        environment: {
          pattern: RegExp('(^|[\\s;|&]|[<>]\\()' + envVars),
          lookbehind: true,
          alias: 'constant',
        },
      },
      alias: 'variable',
      lookbehind: true,
    },
    // Highlight parameter names as variables
    parameter: {
      pattern: /(^|\s)-{1,2}(?:\w+:[+-]?)?\w+(?:\.\w+)*(?=[=\s]|$)/,
      alias: 'variable',
      lookbehind: true,
    },
    string: [
      // Support for Here-documents https://en.wikipedia.org/wiki/Here_document
      {
        pattern: /((?:^|[^<])<<-?\s*)(\w+)\s[\s\S]*?(?:\r?\n|\r)\2/,
        lookbehind: true,
        greedy: true,
        inside: insideString,
      },
      // Here-document with quotes around the tag
      // → No expansion (so no “inside”).
      {
        pattern: /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,
        lookbehind: true,
        greedy: true,
        inside: {
          bash: commandAfterHeredoc,
        },
      },
      // “Normal” string
      {
        // https://www.gnu.org/software/bash/manual/html_node/Double-Quotes.html
        pattern: /(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/,
        lookbehind: true,
        greedy: true,
        inside: insideString,
      },
      {
        // https://www.gnu.org/software/bash/manual/html_node/Single-Quotes.html
        pattern: /(^|[^$\\])'[^']*'/,
        lookbehind: true,
        greedy: true,
      },
      {
        // https://www.gnu.org/software/bash/manual/html_node/ANSI_002dC-Quoting.html
        pattern: /\$'(?:[^'\\]|\\[\s\S])*'/,
        greedy: true,
        inside: {
          entity: insideString.entity,
        },
      },
    ],
    environment: {
      pattern: RegExp('\\$?' + envVars),
      alias: 'constant',
    },
    variable: insideString.variable,
    function: {
      pattern:
        /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|apt-cache|apt-get|aptitude|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cargo|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|docker|docker-compose|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|java|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|node|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|podman|podman-compose|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|sysctl|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vcpkg|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
      lookbehind: true,
    },
    keyword: {
      pattern:
        /(^|[\s;|&]|[<>]\()(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while)(?=$|[)\s;|&])/,
      lookbehind: true,
    },
    // https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
    builtin: {
      pattern:
        /(^|[\s;|&]|[<>]\()(?:\.|:|alias|bind|break|builtin|caller|cd|command|continue|declare|echo|enable|eval|exec|exit|export|getopts|hash|help|let|local|logout|mapfile|printf|pwd|read|readarray|readonly|return|set|shift|shopt|source|test|times|trap|type|typeset|ulimit|umask|unalias|unset)(?=$|[)\s;|&])/,
      lookbehind: true,
      // Alias added to make those easier to distinguish from strings.
      alias: 'class-name',
    },
    boolean: {
      pattern: /(^|[\s;|&]|[<>]\()(?:false|true)(?=$|[)\s;|&])/,
      lookbehind: true,
    },
    'file-descriptor': {
      pattern: /\B&\d\b/,
      alias: 'important',
    },
    operator: {
      // Lots of redirections here, but not just that.
      pattern: /\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,
      inside: {
        'file-descriptor': {
          pattern: /^\d/,
          alias: 'important',
        },
      },
    },
    punctuation: /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
    number: {
      pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
      lookbehind: true,
    },
  };

  commandAfterHeredoc.inside = Prism.languages.bash;

  /* Patterns in command substitution. */
  var toBeCopied = [
    'comment',
    'function-name',
    'for-or-select',
    'assign-left',
    'parameter',
    'string',
    'environment',
    'function',
    'keyword',
    'builtin',
    'boolean',
    'file-descriptor',
    'operator',
    'punctuation',
    'number',
  ];
  var inside = insideString.variable[1].inside;
  for (var i = 0; i < toBeCopied.length; i++) {
    inside[toBeCopied[i]] = Prism.languages.bash[toBeCopied[i]];
  }

  Prism.languages.sh = Prism.languages.bash;
  Prism.languages.shell = Prism.languages.bash;
})(Prism);

Prism.languages.basic = {
  comment: {
    pattern: /(?:!|REM\b).+/i,
    inside: {
      keyword: /^REM/i,
    },
  },
  string: {
    pattern: /"(?:""|[!#$%&'()*,\/:;<=>?^\w +\-.])*"/,
    greedy: true,
  },
  number: /(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:E[+-]?\d+)?/i,
  keyword:
    /\b(?:AS|BEEP|BLOAD|BSAVE|CALL(?: ABSOLUTE)?|CASE|CHAIN|CHDIR|CLEAR|CLOSE|CLS|COM|COMMON|CONST|DATA|DECLARE|DEF(?: FN| SEG|DBL|INT|LNG|SNG|STR)|DIM|DO|DOUBLE|ELSE|ELSEIF|END|ENVIRON|ERASE|ERROR|EXIT|FIELD|FILES|FOR|FUNCTION|GET|GOSUB|GOTO|IF|INPUT|INTEGER|IOCTL|KEY|KILL|LINE INPUT|LOCATE|LOCK|LONG|LOOP|LSET|MKDIR|NAME|NEXT|OFF|ON(?: COM| ERROR| KEY| TIMER)?|OPEN|OPTION BASE|OUT|POKE|PUT|READ|REDIM|REM|RESTORE|RESUME|RETURN|RMDIR|RSET|RUN|SELECT CASE|SHARED|SHELL|SINGLE|SLEEP|STATIC|STEP|STOP|STRING|SUB|SWAP|SYSTEM|THEN|TIMER|TO|TROFF|TRON|TYPE|UNLOCK|UNTIL|USING|VIEW PRINT|WAIT|WEND|WHILE|WRITE)(?:\$|\b)/i,
  function:
    /\b(?:ABS|ACCESS|ACOS|ANGLE|AREA|ARITHMETIC|ARRAY|ASIN|ASK|AT|ATN|BASE|BEGIN|BREAK|CAUSE|CEIL|CHR|CLIP|COLLATE|COLOR|CON|COS|COSH|COT|CSC|DATE|DATUM|DEBUG|DECIMAL|DEF|DEG|DEGREES|DELETE|DET|DEVICE|DISPLAY|DOT|ELAPSED|EPS|ERASABLE|EXLINE|EXP|EXTERNAL|EXTYPE|FILETYPE|FIXED|FP|GO|GRAPH|HANDLER|IDN|IMAGE|IN|INT|INTERNAL|IP|IS|KEYED|LBOUND|LCASE|LEFT|LEN|LENGTH|LET|LINE|LINES|LOG|LOG10|LOG2|LTRIM|MARGIN|MAT|MAX|MAXNUM|MID|MIN|MISSING|MOD|NATIVE|NUL|NUMERIC|OF|OPTION|ORD|ORGANIZATION|OUTIN|OUTPUT|PI|POINT|POINTER|POINTS|POS|PRINT|PROGRAM|PROMPT|RAD|RADIANS|RANDOMIZE|RECORD|RECSIZE|RECTYPE|RELATIVE|REMAINDER|REPEAT|REST|RETRY|REWRITE|RIGHT|RND|ROUND|RTRIM|SAME|SEC|SELECT|SEQUENTIAL|SET|SETTER|SGN|SIN|SINH|SIZE|SKIP|SQR|STANDARD|STATUS|STR|STREAM|STYLE|TAB|TAN|TANH|TEMPLATE|TEXT|THERE|TIME|TIMEOUT|TRACE|TRANSFORM|TRUNCATE|UBOUND|UCASE|USE|VAL|VARIABLE|VIEWPORT|WHEN|WINDOW|WITH|ZER|ZONEWIDTH)(?:\$|\b)/i,
  operator: /<[=>]?|>=?|[+\-*\/^=&]|\b(?:AND|EQV|IMP|NOT|OR|XOR)\b/i,
  punctuation: /[,;:()]/,
};

Prism.languages.c = Prism.languages.extend('clike', {
  comment: {
    pattern: /\/\/(?:[^\r\n\\]|\\(?:\r\n?|\n|(?![\r\n])))*|\/\*[\s\S]*?(?:\*\/|$)/,
    greedy: true,
  },
  string: {
    // https://en.cppreference.com/w/c/language/string_literal
    pattern: /"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"/,
    greedy: true,
  },
  'class-name': {
    pattern: /(\b(?:enum|struct)\s+(?:__attribute__\s*\(\([\s\S]*?\)\)\s*)?)\w+|\b[a-z]\w*_t\b/,
    lookbehind: true,
  },
  keyword:
    /\b(?:_Alignas|_Alignof|_Atomic|_Bool|_Complex|_Generic|_Imaginary|_Noreturn|_Static_assert|_Thread_local|__attribute__|asm|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|typeof|union|unsigned|void|volatile|while)\b/,
  function: /\b[a-z_]\w*(?=\s*\()/i,
  number:
    /(?:\b0x(?:[\da-f]+(?:\.[\da-f]*)?|\.[\da-f]+)(?:p[+-]?\d+)?|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?)[ful]{0,4}/i,
  operator: />>=?|<<=?|->|([-+&|:])\1|[?:~]|[-+*/%&|^!=<>]=?/,
});

Prism.languages.insertBefore('c', 'string', {
  char: {
    // https://en.cppreference.com/w/c/language/character_constant
    pattern: /'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n]){0,32}'/,
    greedy: true,
  },
});

Prism.languages.insertBefore('c', 'string', {
  macro: {
    // allow for multiline macro definitions
    // spaces after the # character compile fine with gcc
    pattern:
      /(^[\t ]*)#\s*[a-z](?:[^\r\n\\/]|\/(?!\*)|\/\*(?:[^*]|\*(?!\/))*\*\/|\\(?:\r\n|[\s\S]))*/im,
    lookbehind: true,
    greedy: true,
    alias: 'property',
    inside: {
      string: [
        {
          // highlight the path of the include statement as a string
          pattern: /^(#\s*include\s*)<[^>]+>/,
          lookbehind: true,
        },
        Prism.languages.c['string'],
      ],
      char: Prism.languages.c['char'],
      comment: Prism.languages.c['comment'],
      'macro-name': [
        {
          pattern: /(^#\s*define\s+)\w+\b(?!\()/i,
          lookbehind: true,
        },
        {
          pattern: /(^#\s*define\s+)\w+\b(?=\()/i,
          lookbehind: true,
          alias: 'function',
        },
      ],
      // highlight macro directives as keywords
      directive: {
        pattern: /^(#\s*)[a-z]+/,
        lookbehind: true,
        alias: 'keyword',
      },
      'directive-hash': /^#/,
      punctuation: /##|\\(?=[\r\n])/,
      expression: {
        pattern: /\S[\s\S]*/,
        inside: Prism.languages.c,
      },
    },
  },
});

Prism.languages.insertBefore('c', 'function', {
  // highlight predefined macros as constants
  constant:
    /\b(?:EOF|NULL|SEEK_CUR|SEEK_END|SEEK_SET|__DATE__|__FILE__|__LINE__|__TIMESTAMP__|__TIME__|__func__|stderr|stdin|stdout)\b/,
});

delete Prism.languages.c['boolean'];

(function (Prism) {
  /**
   * Replaces all placeholders "<<n>>" of given pattern with the n-th replacement (zero based).
   *
   * Note: This is a simple text based replacement. Be careful when using backreferences!
   *
   * @param {string} pattern the given pattern.
   * @param {string[]} replacements a list of replacement which can be inserted into the given pattern.
   * @returns {string} the pattern with all placeholders replaced with their corresponding replacements.
   * @example replace(/a<<0>>a/.source, [/b+/.source]) === /a(?:b+)a/.source
   */
  function replace(pattern, replacements) {
    return pattern.replace(/<<(\d+)>>/g, function (m, index) {
      return '(?:' + replacements[+index] + ')';
    });
  }
  /**
   * @param {string} pattern
   * @param {string[]} replacements
   * @param {string} [flags]
   * @returns {RegExp}
   */
  function re(pattern, replacements, flags) {
    return RegExp(replace(pattern, replacements), flags || '');
  }

  /**
   * Creates a nested pattern where all occurrences of the string `<<self>>` are replaced with the pattern itself.
   *
   * @param {string} pattern
   * @param {number} depthLog2
   * @returns {string}
   */
  function nested(pattern, depthLog2) {
    for (var i = 0; i < depthLog2; i++) {
      pattern = pattern.replace(/<<self>>/g, function () {
        return '(?:' + pattern + ')';
      });
    }
    return pattern.replace(/<<self>>/g, '[^\\s\\S]');
  }

  // https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/
  var keywordKinds = {
    // keywords which represent a return or variable type
    type: 'bool byte char decimal double dynamic float int long object sbyte short string uint ulong ushort var void',
    // keywords which are used to declare a type
    typeDeclaration: 'class enum interface record struct',
    // contextual keywords
    // ("var" and "dynamic" are missing because they are used like types)
    contextual:
      'add alias and ascending async await by descending from(?=\\s*(?:\\w|$)) get global group into init(?=\\s*;) join let nameof not notnull on or orderby partial remove select set unmanaged value when where with(?=\\s*{)',
    // all other keywords
    other:
      'abstract as base break case catch checked const continue default delegate do else event explicit extern finally fixed for foreach goto if implicit in internal is lock namespace new null operator out override params private protected public readonly ref return sealed sizeof stackalloc static switch this throw try typeof unchecked unsafe using virtual volatile while yield',
  };

  // keywords
  function keywordsToPattern(words) {
    return '\\b(?:' + words.trim().replace(/ /g, '|') + ')\\b';
  }
  var typeDeclarationKeywords = keywordsToPattern(keywordKinds.typeDeclaration);
  var keywords = RegExp(
    keywordsToPattern(
      keywordKinds.type +
        ' ' +
        keywordKinds.typeDeclaration +
        ' ' +
        keywordKinds.contextual +
        ' ' +
        keywordKinds.other
    )
  );
  var nonTypeKeywords = keywordsToPattern(
    keywordKinds.typeDeclaration + ' ' + keywordKinds.contextual + ' ' + keywordKinds.other
  );
  var nonContextualKeywords = keywordsToPattern(
    keywordKinds.type + ' ' + keywordKinds.typeDeclaration + ' ' + keywordKinds.other
  );

  // types
  var generic = nested(/<(?:[^<>;=+\-*/%&|^]|<<self>>)*>/.source, 2); // the idea behind the other forbidden characters is to prevent false positives. Same for tupleElement.
  var nestedRound = nested(/\((?:[^()]|<<self>>)*\)/.source, 2);
  var name = /@?\b[A-Za-z_]\w*\b/.source;
  var genericName = replace(/<<0>>(?:\s*<<1>>)?/.source, [name, generic]);
  var identifier = replace(/(?!<<0>>)<<1>>(?:\s*\.\s*<<1>>)*/.source, [
    nonTypeKeywords,
    genericName,
  ]);
  var array = /\[\s*(?:,\s*)*\]/.source;
  var typeExpressionWithoutTuple = replace(/<<0>>(?:\s*(?:\?\s*)?<<1>>)*(?:\s*\?)?/.source, [
    identifier,
    array,
  ]);
  var tupleElement = replace(/[^,()<>[\];=+\-*/%&|^]|<<0>>|<<1>>|<<2>>/.source, [
    generic,
    nestedRound,
    array,
  ]);
  var tuple = replace(/\(<<0>>+(?:,<<0>>+)+\)/.source, [tupleElement]);
  var typeExpression = replace(/(?:<<0>>|<<1>>)(?:\s*(?:\?\s*)?<<2>>)*(?:\s*\?)?/.source, [
    tuple,
    identifier,
    array,
  ]);

  var typeInside = {
    keyword: keywords,
    punctuation: /[<>()?,.:[\]]/,
  };

  // strings & characters
  // https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/lexical-structure#character-literals
  // https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/lexical-structure#string-literals
  var character = /'(?:[^\r\n'\\]|\\.|\\[Uux][\da-fA-F]{1,8})'/.source; // simplified pattern
  var regularString = /"(?:\\.|[^\\"\r\n])*"/.source;
  var verbatimString = /@"(?:""|\\[\s\S]|[^\\"])*"(?!")/.source;

  Prism.languages.csharp = Prism.languages.extend('clike', {
    string: [
      {
        pattern: re(/(^|[^$\\])<<0>>/.source, [verbatimString]),
        lookbehind: true,
        greedy: true,
      },
      {
        pattern: re(/(^|[^@$\\])<<0>>/.source, [regularString]),
        lookbehind: true,
        greedy: true,
      },
    ],
    'class-name': [
      {
        // Using static
        // using static System.Math;
        pattern: re(/(\busing\s+static\s+)<<0>>(?=\s*;)/.source, [identifier]),
        lookbehind: true,
        inside: typeInside,
      },
      {
        // Using alias (type)
        // using Project = PC.MyCompany.Project;
        pattern: re(/(\busing\s+<<0>>\s*=\s*)<<1>>(?=\s*;)/.source, [name, typeExpression]),
        lookbehind: true,
        inside: typeInside,
      },
      {
        // Using alias (alias)
        // using Project = PC.MyCompany.Project;
        pattern: re(/(\busing\s+)<<0>>(?=\s*=)/.source, [name]),
        lookbehind: true,
      },
      {
        // Type declarations
        // class Foo<A, B>
        // interface Foo<out A, B>
        pattern: re(/(\b<<0>>\s+)<<1>>/.source, [typeDeclarationKeywords, genericName]),
        lookbehind: true,
        inside: typeInside,
      },
      {
        // Single catch exception declaration
        // catch(Foo)
        // (things like catch(Foo e) is covered by variable declaration)
        pattern: re(/(\bcatch\s*\(\s*)<<0>>/.source, [identifier]),
        lookbehind: true,
        inside: typeInside,
      },
      {
        // Name of the type parameter of generic constraints
        // where Foo : class
        pattern: re(/(\bwhere\s+)<<0>>/.source, [name]),
        lookbehind: true,
      },
      {
        // Casts and checks via as and is.
        // as Foo<A>, is Bar<B>
        // (things like if(a is Foo b) is covered by variable declaration)
        pattern: re(/(\b(?:is(?:\s+not)?|as)\s+)<<0>>/.source, [typeExpressionWithoutTuple]),
        lookbehind: true,
        inside: typeInside,
      },
      {
        // Variable, field and parameter declaration
        // (Foo bar, Bar baz, Foo[,,] bay, Foo<Bar, FooBar<Bar>> bax)
        pattern: re(
          /\b<<0>>(?=\s+(?!<<1>>|with\s*\{)<<2>>(?:\s*[=,;:{)\]]|\s+(?:in|when)\b))/.source,
          [typeExpression, nonContextualKeywords, name]
        ),
        inside: typeInside,
      },
    ],
    keyword: keywords,
    // https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/lexical-structure#literals
    number:
      /(?:\b0(?:x[\da-f_]*[\da-f]|b[01_]*[01])|(?:\B\.\d+(?:_+\d+)*|\b\d+(?:_+\d+)*(?:\.\d+(?:_+\d+)*)?)(?:e[-+]?\d+(?:_+\d+)*)?)(?:[dflmu]|lu|ul)?\b/i,
    operator: />>=?|<<=?|[-=]>|([-+&|])\1|~|\?\?=?|[-+*/%&|^!=<>]=?/,
    punctuation: /\?\.?|::|[{}[\];(),.:]/,
  });

  Prism.languages.insertBefore('csharp', 'number', {
    range: {
      pattern: /\.\./,
      alias: 'operator',
    },
  });

  Prism.languages.insertBefore('csharp', 'punctuation', {
    'named-parameter': {
      pattern: re(/([(,]\s*)<<0>>(?=\s*:)/.source, [name]),
      lookbehind: true,
      alias: 'punctuation',
    },
  });

  Prism.languages.insertBefore('csharp', 'class-name', {
    namespace: {
      // namespace Foo.Bar {}
      // using Foo.Bar;
      pattern: re(/(\b(?:namespace|using)\s+)<<0>>(?:\s*\.\s*<<0>>)*(?=\s*[;{])/.source, [name]),
      lookbehind: true,
      inside: {
        punctuation: /\./,
      },
    },
    'type-expression': {
      // default(Foo), typeof(Foo<Bar>), sizeof(int)
      pattern: re(
        /(\b(?:default|sizeof|typeof)\s*\(\s*(?!\s))(?:[^()\s]|\s(?!\s)|<<0>>)*(?=\s*\))/.source,
        [nestedRound]
      ),
      lookbehind: true,
      alias: 'class-name',
      inside: typeInside,
    },
    'return-type': {
      // Foo<Bar> ForBar(); Foo IFoo.Bar() => 0
      // int this[int index] => 0; T IReadOnlyList<T>.this[int index] => this[index];
      // int Foo => 0; int Foo { get; set } = 0;
      pattern: re(/<<0>>(?=\s+(?:<<1>>\s*(?:=>|[({]|\.\s*this\s*\[)|this\s*\[))/.source, [
        typeExpression,
        identifier,
      ]),
      inside: typeInside,
      alias: 'class-name',
    },
    'constructor-invocation': {
      // new List<Foo<Bar[]>> { }
      pattern: re(/(\bnew\s+)<<0>>(?=\s*[[({])/.source, [typeExpression]),
      lookbehind: true,
      inside: typeInside,
      alias: 'class-name',
    },
    /*'explicit-implementation': {
			// int IFoo<Foo>.Bar => 0; void IFoo<Foo<Foo>>.Foo<T>();
			pattern: replace(/\b<<0>>(?=\.<<1>>)/, className, methodOrPropertyDeclaration),
			inside: classNameInside,
			alias: 'class-name'
		},*/
    'generic-method': {
      // foo<Bar>()
      pattern: re(/<<0>>\s*<<1>>(?=\s*\()/.source, [name, generic]),
      inside: {
        function: re(/^<<0>>/.source, [name]),
        generic: {
          pattern: RegExp(generic),
          alias: 'class-name',
          inside: typeInside,
        },
      },
    },
    'type-list': {
      // The list of types inherited or of generic constraints
      // class Foo<F> : Bar, IList<FooBar>
      // where F : Bar, IList<int>
      pattern: re(
        /\b((?:<<0>>\s+<<1>>|record\s+<<1>>\s*<<5>>|where\s+<<2>>)\s*:\s*)(?:<<3>>|<<4>>|<<1>>\s*<<5>>|<<6>>)(?:\s*,\s*(?:<<3>>|<<4>>|<<6>>))*(?=\s*(?:where|[{;]|=>|$))/
          .source,
        [
          typeDeclarationKeywords,
          genericName,
          name,
          typeExpression,
          keywords.source,
          nestedRound,
          /\bnew\s*\(\s*\)/.source,
        ]
      ),
      lookbehind: true,
      inside: {
        'record-arguments': {
          pattern: re(/(^(?!new\s*\()<<0>>\s*)<<1>>/.source, [genericName, nestedRound]),
          lookbehind: true,
          greedy: true,
          inside: Prism.languages.csharp,
        },
        keyword: keywords,
        'class-name': {
          pattern: RegExp(typeExpression),
          greedy: true,
          inside: typeInside,
        },
        punctuation: /[,()]/,
      },
    },
    preprocessor: {
      pattern: /(^[\t ]*)#.*/m,
      lookbehind: true,
      alias: 'property',
      inside: {
        // highlight preprocessor directives as keywords
        directive: {
          pattern:
            /(#)\b(?:define|elif|else|endif|endregion|error|if|line|nullable|pragma|region|undef|warning)\b/,
          lookbehind: true,
          alias: 'keyword',
        },
      },
    },
  });

  // attributes
  var regularStringOrCharacter = regularString + '|' + character;
  var regularStringCharacterOrComment = replace(
    /\/(?![*/])|\/\/[^\r\n]*[\r\n]|\/\*(?:[^*]|\*(?!\/))*\*\/|<<0>>/.source,
    [regularStringOrCharacter]
  );
  var roundExpression = nested(
    replace(/[^"'/()]|<<0>>|\(<<self>>*\)/.source, [regularStringCharacterOrComment]),
    2
  );

  // https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/attributes/#attribute-targets
  var attrTarget = /\b(?:assembly|event|field|method|module|param|property|return|type)\b/.source;
  var attr = replace(/<<0>>(?:\s*\(<<1>>*\))?/.source, [identifier, roundExpression]);

  Prism.languages.insertBefore('csharp', 'class-name', {
    attribute: {
      // Attributes
      // [Foo], [Foo(1), Bar(2, Prop = "foo")], [return: Foo(1), Bar(2)], [assembly: Foo(Bar)]
      pattern: re(
        /((?:^|[^\s\w>)?])\s*\[\s*)(?:<<0>>\s*:\s*)?<<1>>(?:\s*,\s*<<1>>)*(?=\s*\])/.source,
        [attrTarget, attr]
      ),
      lookbehind: true,
      greedy: true,
      inside: {
        target: {
          pattern: re(/^<<0>>(?=\s*:)/.source, [attrTarget]),
          alias: 'keyword',
        },
        'attribute-arguments': {
          pattern: re(/\(<<0>>*\)/.source, [roundExpression]),
          inside: Prism.languages.csharp,
        },
        'class-name': {
          pattern: RegExp(identifier),
          inside: {
            punctuation: /\./,
          },
        },
        punctuation: /[:,]/,
      },
    },
  });

  // string interpolation
  var formatString = /:[^}\r\n]+/.source;
  // multi line
  var mInterpolationRound = nested(
    replace(/[^"'/()]|<<0>>|\(<<self>>*\)/.source, [regularStringCharacterOrComment]),
    2
  );
  var mInterpolation = replace(/\{(?!\{)(?:(?![}:])<<0>>)*<<1>>?\}/.source, [
    mInterpolationRound,
    formatString,
  ]);
  // single line
  var sInterpolationRound = nested(
    replace(/[^"'/()]|\/(?!\*)|\/\*(?:[^*]|\*(?!\/))*\*\/|<<0>>|\(<<self>>*\)/.source, [
      regularStringOrCharacter,
    ]),
    2
  );
  var sInterpolation = replace(/\{(?!\{)(?:(?![}:])<<0>>)*<<1>>?\}/.source, [
    sInterpolationRound,
    formatString,
  ]);

  function createInterpolationInside(interpolation, interpolationRound) {
    return {
      interpolation: {
        pattern: re(/((?:^|[^{])(?:\{\{)*)<<0>>/.source, [interpolation]),
        lookbehind: true,
        inside: {
          'format-string': {
            pattern: re(/(^\{(?:(?![}:])<<0>>)*)<<1>>(?=\}$)/.source, [
              interpolationRound,
              formatString,
            ]),
            lookbehind: true,
            inside: {
              punctuation: /^:/,
            },
          },
          punctuation: /^\{|\}$/,
          expression: {
            pattern: /[\s\S]+/,
            alias: 'language-csharp',
            inside: Prism.languages.csharp,
          },
        },
      },
      string: /[\s\S]+/,
    };
  }

  Prism.languages.insertBefore('csharp', 'string', {
    'interpolation-string': [
      {
        pattern: re(/(^|[^\\])(?:\$@|@\$)"(?:""|\\[\s\S]|\{\{|<<0>>|[^\\{"])*"/.source, [
          mInterpolation,
        ]),
        lookbehind: true,
        greedy: true,
        inside: createInterpolationInside(mInterpolation, mInterpolationRound),
      },
      {
        pattern: re(/(^|[^@\\])\$"(?:\\.|\{\{|<<0>>|[^\\"{])*"/.source, [sInterpolation]),
        lookbehind: true,
        greedy: true,
        inside: createInterpolationInside(sInterpolation, sInterpolationRound),
      },
    ],
    char: {
      pattern: RegExp(character),
      greedy: true,
    },
  });

  Prism.languages.dotnet = Prism.languages.cs = Prism.languages.csharp;
})(Prism);

(function (Prism) {
  var keyword =
    /\b(?:alignas|alignof|asm|auto|bool|break|case|catch|char|char16_t|char32_t|char8_t|class|co_await|co_return|co_yield|compl|concept|const|const_cast|consteval|constexpr|constinit|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|final|float|for|friend|goto|if|import|inline|int|int16_t|int32_t|int64_t|int8_t|long|module|mutable|namespace|new|noexcept|nullptr|operator|override|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|uint16_t|uint32_t|uint64_t|uint8_t|union|unsigned|using|virtual|void|volatile|wchar_t|while)\b/;
  var modName = /\b(?!<keyword>)\w+(?:\s*\.\s*\w+)*\b/.source.replace(/<keyword>/g, function () {
    return keyword.source;
  });

  Prism.languages.cpp = Prism.languages.extend('c', {
    'class-name': [
      {
        pattern: RegExp(
          /(\b(?:class|concept|enum|struct|typename)\s+)(?!<keyword>)\w+/.source.replace(
            /<keyword>/g,
            function () {
              return keyword.source;
            }
          )
        ),
        lookbehind: true,
      },
      // This is intended to capture the class name of method implementations like:
      //   void foo::bar() const {}
      // However! The `foo` in the above example could also be a namespace, so we only capture the class name if
      // it starts with an uppercase letter. This approximation should give decent results.
      /\b[A-Z]\w*(?=\s*::\s*\w+\s*\()/,
      // This will capture the class name before destructors like:
      //   Foo::~Foo() {}
      /\b[A-Z_]\w*(?=\s*::\s*~\w+\s*\()/i,
      // This also intends to capture the class name of method implementations but here the class has template
      // parameters, so it can't be a namespace (until C++ adds generic namespaces).
      /\b\w+(?=\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>\s*::\s*\w+\s*\()/,
    ],
    keyword: keyword,
    number: {
      pattern:
        /(?:\b0b[01']+|\b0x(?:[\da-f']+(?:\.[\da-f']*)?|\.[\da-f']+)(?:p[+-]?[\d']+)?|(?:\b[\d']+(?:\.[\d']*)?|\B\.[\d']+)(?:e[+-]?[\d']+)?)[ful]{0,4}/i,
      greedy: true,
    },
    operator:
      />>=?|<<=?|->|--|\+\+|&&|\|\||[?:~]|<=>|[-+*/%&|^!=<>]=?|\b(?:and|and_eq|bitand|bitor|not|not_eq|or|or_eq|xor|xor_eq)\b/,
    boolean: /\b(?:false|true)\b/,
  });

  Prism.languages.insertBefore('cpp', 'string', {
    module: {
      // https://en.cppreference.com/w/cpp/language/modules
      pattern: RegExp(
        /(\b(?:import|module)\s+)/.source +
          '(?:' +
          // header-name
          /"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|<[^<>\r\n]*>/.source +
          '|' +
          // module name or partition or both
          /<mod-name>(?:\s*:\s*<mod-name>)?|:\s*<mod-name>/.source.replace(
            /<mod-name>/g,
            function () {
              return modName;
            }
          ) +
          ')'
      ),
      lookbehind: true,
      greedy: true,
      inside: {
        string: /^[<"][\s\S]+/,
        operator: /:/,
        punctuation: /\./,
      },
    },
    'raw-string': {
      pattern: /R"([^()\\ ]{0,16})\([\s\S]*?\)\1"/,
      alias: 'string',
      greedy: true,
    },
  });

  Prism.languages.insertBefore('cpp', 'keyword', {
    'generic-function': {
      pattern: /\b(?!operator\b)[a-z_]\w*\s*<(?:[^<>]|<[^<>]*>)*>(?=\s*\()/i,
      inside: {
        function: /^\w+/,
        generic: {
          pattern: /<[\s\S]+/,
          alias: 'class-name',
          inside: Prism.languages.cpp,
        },
      },
    },
  });

  Prism.languages.insertBefore('cpp', 'operator', {
    'double-colon': {
      pattern: /::/,
      alias: 'punctuation',
    },
  });

  Prism.languages.insertBefore('cpp', 'class-name', {
    // the base clause is an optional list of parent classes
    // https://en.cppreference.com/w/cpp/language/class
    'base-clause': {
      pattern: /(\b(?:class|struct)\s+\w+\s*:\s*)[^;{}"'\s]+(?:\s+[^;{}"'\s]+)*(?=\s*[;{])/,
      lookbehind: true,
      greedy: true,
      inside: Prism.languages.extend('cpp', {}),
    },
  });

  Prism.languages.insertBefore(
    'inside',
    'double-colon',
    {
      // All untokenized words that are not namespaces should be class names
      'class-name': /\b[a-z_]\w*\b(?!\s*::)/i,
    },
    Prism.languages.cpp['base-clause']
  );
})(Prism);

// Copied from https://github.com/jeluard/prism-clojure
Prism.languages.clojure = {
  comment: {
    pattern: /;.*/,
    greedy: true,
  },
  string: {
    pattern: /"(?:[^"\\]|\\.)*"/,
    greedy: true,
  },
  char: /\\\w+/,
  symbol: {
    pattern: /(^|[\s()\[\]{},])::?[\w*+!?'<>=/.-]+/,
    lookbehind: true,
  },
  keyword: {
    pattern:
      /(\()(?:-|->|->>|\.|\.\.|\*|\/|\+|<|<=|=|==|>|>=|accessor|agent|agent-errors|aget|alength|all-ns|alter|and|append-child|apply|array-map|aset|aset-boolean|aset-byte|aset-char|aset-double|aset-float|aset-int|aset-long|aset-short|assert|assoc|await|await-for|bean|binding|bit-and|bit-not|bit-or|bit-shift-left|bit-shift-right|bit-xor|boolean|branch\?|butlast|byte|cast|char|children|class|clear-agent-errors|comment|commute|comp|comparator|complement|concat|cond|conj|cons|constantly|construct-proxy|contains\?|count|create-ns|create-struct|cycle|dec|declare|def|def-|definline|definterface|defmacro|defmethod|defmulti|defn|defn-|defonce|defproject|defprotocol|defrecord|defstruct|deftype|deref|difference|disj|dissoc|distinct|do|doall|doc|dorun|doseq|dosync|dotimes|doto|double|down|drop|drop-while|edit|end\?|ensure|eval|every\?|false\?|ffirst|file-seq|filter|find|find-doc|find-ns|find-var|first|float|flush|fn|fnseq|for|frest|gensym|get|get-proxy-class|hash-map|hash-set|identical\?|identity|if|if-let|if-not|import|in-ns|inc|index|insert-child|insert-left|insert-right|inspect-table|inspect-tree|instance\?|int|interleave|intersection|into|into-array|iterate|join|key|keys|keyword|keyword\?|last|lazy-cat|lazy-cons|left|lefts|let|line-seq|list|list\*|load|load-file|locking|long|loop|macroexpand|macroexpand-1|make-array|make-node|map|map-invert|map\?|mapcat|max|max-key|memfn|merge|merge-with|meta|min|min-key|monitor-enter|name|namespace|neg\?|new|newline|next|nil\?|node|not|not-any\?|not-every\?|not=|ns|ns-imports|ns-interns|ns-map|ns-name|ns-publics|ns-refers|ns-resolve|ns-unmap|nth|nthrest|or|parse|partial|path|peek|pop|pos\?|pr|pr-str|print|print-str|println|println-str|prn|prn-str|project|proxy|proxy-mappings|quot|quote|rand|rand-int|range|re-find|re-groups|re-matcher|re-matches|re-pattern|re-seq|read|read-line|recur|reduce|ref|ref-set|refer|rem|remove|remove-method|remove-ns|rename|rename-keys|repeat|replace|replicate|resolve|rest|resultset-seq|reverse|rfirst|right|rights|root|rrest|rseq|second|select|select-keys|send|send-off|seq|seq-zip|seq\?|set|set!|short|slurp|some|sort|sort-by|sorted-map|sorted-map-by|sorted-set|special-symbol\?|split-at|split-with|str|string\?|struct|struct-map|subs|subvec|symbol|symbol\?|sync|take|take-nth|take-while|test|throw|time|to-array|to-array-2d|tree-seq|true\?|try|union|up|update-proxy|val|vals|var|var-get|var-set|var\?|vector|vector-zip|vector\?|when|when-first|when-let|when-not|with-local-vars|with-meta|with-open|with-out-str|xml-seq|xml-zip|zero\?|zipmap|zipper)(?=[\s)]|$)/,
    lookbehind: true,
  },
  boolean: /\b(?:false|nil|true)\b/,
  number: {
    pattern:
      /(^|[^\w$@])(?:\d+(?:[/.]\d+)?(?:e[+-]?\d+)?|0x[a-f0-9]+|[1-9]\d?r[a-z0-9]+)[lmn]?(?![\w$@])/i,
    lookbehind: true,
  },
  function: {
    pattern: /((?:^|[^'])\()[\w*+!?'<>=/.-]+(?=[\s)]|$)/,
    lookbehind: true,
  },
  operator: /[#@^`~]/,
  punctuation: /[{}\[\](),]/,
};

Prism.languages.cobol = {
  comment: {
    pattern: /\*>.*|(^[ \t]*)\*.*/m,
    lookbehind: true,
    greedy: true,
  },
  string: {
    pattern: /[xzgn]?(?:"(?:[^\r\n"]|"")*"(?!")|'(?:[^\r\n']|'')*'(?!'))/i,
    greedy: true,
  },

  level: {
    pattern: /(^[ \t]*)\d+\b/m,
    lookbehind: true,
    greedy: true,
    alias: 'number',
  },

  'class-name': {
    // https://github.com/antlr/grammars-v4/blob/42edd5b687d183b5fa679e858a82297bd27141e7/cobol85/Cobol85.g4#L1015
    pattern: /(\bpic(?:ture)?\s+)(?:(?:[-\w$/,:*+<>]|\.(?!\s|$))(?:\(\d+\))?)+/i,
    lookbehind: true,
    inside: {
      number: {
        pattern: /(\()\d+/,
        lookbehind: true,
      },
      punctuation: /[()]/,
    },
  },

  keyword: {
    pattern:
      /(^|[^\w-])(?:ABORT|ACCEPT|ACCESS|ADD|ADDRESS|ADVANCING|AFTER|ALIGNED|ALL|ALPHABET|ALPHABETIC|ALPHABETIC-LOWER|ALPHABETIC-UPPER|ALPHANUMERIC|ALPHANUMERIC-EDITED|ALSO|ALTER|ALTERNATE|ANY|ARE|AREA|AREAS|AS|ASCENDING|ASCII|ASSIGN|ASSOCIATED-DATA|ASSOCIATED-DATA-LENGTH|AT|ATTRIBUTE|AUTHOR|AUTO|AUTO-SKIP|BACKGROUND-COLOR|BACKGROUND-COLOUR|BASIS|BEEP|BEFORE|BEGINNING|BELL|BINARY|BIT|BLANK|BLINK|BLOCK|BOTTOM|BOUNDS|BY|BYFUNCTION|BYTITLE|CALL|CANCEL|CAPABLE|CCSVERSION|CD|CF|CH|CHAINING|CHANGED|CHANNEL|CHARACTER|CHARACTERS|CLASS|CLASS-ID|CLOCK-UNITS|CLOSE|CLOSE-DISPOSITION|COBOL|CODE|CODE-SET|COL|COLLATING|COLUMN|COM-REG|COMMA|COMMITMENT|COMMON|COMMUNICATION|COMP|COMP-1|COMP-2|COMP-3|COMP-4|COMP-5|COMPUTATIONAL|COMPUTATIONAL-1|COMPUTATIONAL-2|COMPUTATIONAL-3|COMPUTATIONAL-4|COMPUTATIONAL-5|COMPUTE|CONFIGURATION|CONTAINS|CONTENT|CONTINUE|CONTROL|CONTROL-POINT|CONTROLS|CONVENTION|CONVERTING|COPY|CORR|CORRESPONDING|COUNT|CRUNCH|CURRENCY|CURSOR|DATA|DATA-BASE|DATE|DATE-COMPILED|DATE-WRITTEN|DAY|DAY-OF-WEEK|DBCS|DE|DEBUG-CONTENTS|DEBUG-ITEM|DEBUG-LINE|DEBUG-NAME|DEBUG-SUB-1|DEBUG-SUB-2|DEBUG-SUB-3|DEBUGGING|DECIMAL-POINT|DECLARATIVES|DEFAULT|DEFAULT-DISPLAY|DEFINITION|DELETE|DELIMITED|DELIMITER|DEPENDING|DESCENDING|DESTINATION|DETAIL|DFHRESP|DFHVALUE|DISABLE|DISK|DISPLAY|DISPLAY-1|DIVIDE|DIVISION|DONTCARE|DOUBLE|DOWN|DUPLICATES|DYNAMIC|EBCDIC|EGCS|EGI|ELSE|EMI|EMPTY-CHECK|ENABLE|END|END-ACCEPT|END-ADD|END-CALL|END-COMPUTE|END-DELETE|END-DIVIDE|END-EVALUATE|END-IF|END-MULTIPLY|END-OF-PAGE|END-PERFORM|END-READ|END-RECEIVE|END-RETURN|END-REWRITE|END-SEARCH|END-START|END-STRING|END-SUBTRACT|END-UNSTRING|END-WRITE|ENDING|ENTER|ENTRY|ENTRY-PROCEDURE|ENVIRONMENT|EOL|EOP|EOS|ERASE|ERROR|ESCAPE|ESI|EVALUATE|EVENT|EVERY|EXCEPTION|EXCLUSIVE|EXHIBIT|EXIT|EXPORT|EXTEND|EXTENDED|EXTERNAL|FD|FILE|FILE-CONTROL|FILLER|FINAL|FIRST|FOOTING|FOR|FOREGROUND-COLOR|FOREGROUND-COLOUR|FROM|FULL|FUNCTION|FUNCTION-POINTER|FUNCTIONNAME|GENERATE|GIVING|GLOBAL|GO|GOBACK|GRID|GROUP|HEADING|HIGH-VALUE|HIGH-VALUES|HIGHLIGHT|I-O|I-O-CONTROL|ID|IDENTIFICATION|IF|IMPLICIT|IMPORT|IN|INDEX|INDEXED|INDICATE|INITIAL|INITIALIZE|INITIATE|INPUT|INPUT-OUTPUT|INSPECT|INSTALLATION|INTEGER|INTO|INVALID|INVOKE|IS|JUST|JUSTIFIED|KANJI|KEPT|KEY|KEYBOARD|LABEL|LANGUAGE|LAST|LB|LD|LEADING|LEFT|LEFTLINE|LENGTH|LENGTH-CHECK|LIBACCESS|LIBPARAMETER|LIBRARY|LIMIT|LIMITS|LINAGE|LINAGE-COUNTER|LINE|LINE-COUNTER|LINES|LINKAGE|LIST|LOCAL|LOCAL-STORAGE|LOCK|LONG-DATE|LONG-TIME|LOW-VALUE|LOW-VALUES|LOWER|LOWLIGHT|MEMORY|MERGE|MESSAGE|MMDDYYYY|MODE|MODULES|MORE-LABELS|MOVE|MULTIPLE|MULTIPLY|NAMED|NATIONAL|NATIONAL-EDITED|NATIVE|NEGATIVE|NETWORK|NEXT|NO|NO-ECHO|NULL|NULLS|NUMBER|NUMERIC|NUMERIC-DATE|NUMERIC-EDITED|NUMERIC-TIME|OBJECT-COMPUTER|OCCURS|ODT|OF|OFF|OMITTED|ON|OPEN|OPTIONAL|ORDER|ORDERLY|ORGANIZATION|OTHER|OUTPUT|OVERFLOW|OVERLINE|OWN|PACKED-DECIMAL|PADDING|PAGE|PAGE-COUNTER|PASSWORD|PERFORM|PF|PH|PIC|PICTURE|PLUS|POINTER|PORT|POSITION|POSITIVE|PRINTER|PRINTING|PRIVATE|PROCEDURE|PROCEDURE-POINTER|PROCEDURES|PROCEED|PROCESS|PROGRAM|PROGRAM-ID|PROGRAM-LIBRARY|PROMPT|PURGE|QUEUE|QUOTE|QUOTES|RANDOM|RD|READ|READER|REAL|RECEIVE|RECEIVED|RECORD|RECORDING|RECORDS|RECURSIVE|REDEFINES|REEL|REF|REFERENCE|REFERENCES|RELATIVE|RELEASE|REMAINDER|REMARKS|REMOTE|REMOVAL|REMOVE|RENAMES|REPLACE|REPLACING|REPORT|REPORTING|REPORTS|REQUIRED|RERUN|RESERVE|RESET|RETURN|RETURN-CODE|RETURNING|REVERSE-VIDEO|REVERSED|REWIND|REWRITE|RF|RH|RIGHT|ROUNDED|RUN|SAME|SAVE|SCREEN|SD|SEARCH|SECTION|SECURE|SECURITY|SEGMENT|SEGMENT-LIMIT|SELECT|SEND|SENTENCE|SEPARATE|SEQUENCE|SEQUENTIAL|SET|SHARED|SHAREDBYALL|SHAREDBYRUNUNIT|SHARING|SHIFT-IN|SHIFT-OUT|SHORT-DATE|SIGN|SIZE|SORT|SORT-CONTROL|SORT-CORE-SIZE|SORT-FILE-SIZE|SORT-MERGE|SORT-MESSAGE|SORT-MODE-SIZE|SORT-RETURN|SOURCE|SOURCE-COMPUTER|SPACE|SPACES|SPECIAL-NAMES|STANDARD|STANDARD-1|STANDARD-2|START|STATUS|STOP|STRING|SUB-QUEUE-1|SUB-QUEUE-2|SUB-QUEUE-3|SUBTRACT|SUM|SUPPRESS|SYMBOL|SYMBOLIC|SYNC|SYNCHRONIZED|TABLE|TALLY|TALLYING|TAPE|TASK|TERMINAL|TERMINATE|TEST|TEXT|THEN|THREAD|THREAD-LOCAL|THROUGH|THRU|TIME|TIMER|TIMES|TITLE|TO|TODAYS-DATE|TODAYS-NAME|TOP|TRAILING|TRUNCATED|TYPE|TYPEDEF|UNDERLINE|UNIT|UNSTRING|UNTIL|UP|UPON|USAGE|USE|USING|VALUE|VALUES|VARYING|VIRTUAL|WAIT|WHEN|WHEN-COMPILED|WITH|WORDS|WORKING-STORAGE|WRITE|YEAR|YYYYDDD|YYYYMMDD|ZERO-FILL|ZEROES|ZEROS)(?![\w-])/i,
    lookbehind: true,
  },

  boolean: {
    pattern: /(^|[^\w-])(?:false|true)(?![\w-])/i,
    lookbehind: true,
  },
  number: {
    pattern: /(^|[^\w-])(?:[+-]?(?:(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:e[+-]?\d+)?|zero))(?![\w-])/i,
    lookbehind: true,
  },
  operator: [
    /<>|[<>]=?|[=+*/&]/,
    {
      pattern: /(^|[^\w-])(?:-|and|equal|greater|less|not|or|than)(?![\w-])/i,
      lookbehind: true,
    },
  ],
  punctuation: /[.:,()]/,
};

(function (Prism) {
  var keywords = [
    /\b(?:async|sync|yield)\*/,
    /\b(?:abstract|assert|async|await|break|case|catch|class|const|continue|covariant|default|deferred|do|dynamic|else|enum|export|extends|extension|external|factory|final|finally|for|get|hide|if|implements|import|in|interface|library|mixin|new|null|on|operator|part|rethrow|return|set|show|static|super|switch|sync|this|throw|try|typedef|var|void|while|with|yield)\b/,
  ];

  // Handles named imports, such as http.Client
  var packagePrefix = /(^|[^\w.])(?:[a-z]\w*\s*\.\s*)*(?:[A-Z]\w*\s*\.\s*)*/.source;

  // based on the dart naming conventions
  var className = {
    pattern: RegExp(packagePrefix + /[A-Z](?:[\d_A-Z]*[a-z]\w*)?\b/.source),
    lookbehind: true,
    inside: {
      namespace: {
        pattern: /^[a-z]\w*(?:\s*\.\s*[a-z]\w*)*(?:\s*\.)?/,
        inside: {
          punctuation: /\./,
        },
      },
    },
  };

  Prism.languages.dart = Prism.languages.extend('clike', {
    'class-name': [
      className,
      {
        // variables and parameters
        // this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
        pattern: RegExp(packagePrefix + /[A-Z]\w*(?=\s+\w+\s*[;,=()])/.source),
        lookbehind: true,
        inside: className.inside,
      },
    ],
    keyword: keywords,
    operator: /\bis!|\b(?:as|is)\b|\+\+|--|&&|\|\||<<=?|>>=?|~(?:\/=?)?|[+\-*\/%&^|=!<>]=?|\?/,
  });

  Prism.languages.insertBefore('dart', 'string', {
    'string-literal': {
      pattern: /r?(?:("""|''')[\s\S]*?\1|(["'])(?:\\.|(?!\2)[^\\\r\n])*\2(?!\2))/,
      greedy: true,
      inside: {
        interpolation: {
          pattern: /((?:^|[^\\])(?:\\{2})*)\$(?:\w+|\{(?:[^{}]|\{[^{}]*\})*\})/,
          lookbehind: true,
          inside: {
            punctuation: /^\$\{?|\}$/,
            expression: {
              pattern: /[\s\S]+/,
              inside: Prism.languages.dart,
            },
          },
        },
        string: /[\s\S]+/,
      },
    },
    string: undefined,
  });

  Prism.languages.insertBefore('dart', 'class-name', {
    metadata: {
      pattern: /@\w+/,
      alias: 'function',
    },
  });

  Prism.languages.insertBefore('dart', 'class-name', {
    generics: {
      pattern: /<(?:[\w\s,.&?]|<(?:[\w\s,.&?]|<(?:[\w\s,.&?]|<[\w\s,.&?]*>)*>)*>)*>/,
      inside: {
        'class-name': className,
        keyword: keywords,
        punctuation: /[<>(),.:]/,
        operator: /[?&|]/,
      },
    },
  });
})(Prism);

(function (Prism) {
  // Many of the following regexes will contain negated lookaheads like `[ \t]+(?![ \t])`. This is a trick to ensure
  // that quantifiers behave *atomically*. Atomic quantifiers are necessary to prevent exponential backtracking.

  var spaceAfterBackSlash = /\\[\r\n](?:\s|\\[\r\n]|#.*(?!.))*(?![\s#]|\\[\r\n])/.source;
  // At least one space, comment, or line break
  var space = /(?:[ \t]+(?![ \t])(?:<SP_BS>)?|<SP_BS>)/.source.replace(/<SP_BS>/g, function () {
    return spaceAfterBackSlash;
  });

  var string = /"(?:[^"\\\r\n]|\\(?:\r\n|[\s\S]))*"|'(?:[^'\\\r\n]|\\(?:\r\n|[\s\S]))*'/.source;
  var option = /--[\w-]+=(?:<STR>|(?!["'])(?:[^\s\\]|\\.)+)/.source.replace(/<STR>/g, function () {
    return string;
  });

  var stringRule = {
    pattern: RegExp(string),
    greedy: true,
  };
  var commentRule = {
    pattern: /(^[ \t]*)#.*/m,
    lookbehind: true,
    greedy: true,
  };

  /**
   * @param {string} source
   * @param {string} flags
   * @returns {RegExp}
   */
  function re(source, flags) {
    source = source
      .replace(/<OPT>/g, function () {
        return option;
      })
      .replace(/<SP>/g, function () {
        return space;
      });

    return RegExp(source, flags);
  }

  Prism.languages.docker = {
    instruction: {
      pattern:
        /(^[ \t]*)(?:ADD|ARG|CMD|COPY|ENTRYPOINT|ENV|EXPOSE|FROM|HEALTHCHECK|LABEL|MAINTAINER|ONBUILD|RUN|SHELL|STOPSIGNAL|USER|VOLUME|WORKDIR)(?=\s)(?:\\.|[^\r\n\\])*(?:\\$(?:\s|#.*$)*(?![\s#])(?:\\.|[^\r\n\\])*)*/im,
      lookbehind: true,
      greedy: true,
      inside: {
        options: {
          pattern: re(/(^(?:ONBUILD<SP>)?\w+<SP>)<OPT>(?:<SP><OPT>)*/.source, 'i'),
          lookbehind: true,
          greedy: true,
          inside: {
            property: {
              pattern: /(^|\s)--[\w-]+/,
              lookbehind: true,
            },
            string: [
              stringRule,
              {
                pattern: /(=)(?!["'])(?:[^\s\\]|\\.)+/,
                lookbehind: true,
              },
            ],
            operator: /\\$/m,
            punctuation: /=/,
          },
        },
        keyword: [
          {
            // https://docs.docker.com/engine/reference/builder/#healthcheck
            pattern: re(
              /(^(?:ONBUILD<SP>)?HEALTHCHECK<SP>(?:<OPT><SP>)*)(?:CMD|NONE)\b/.source,
              'i'
            ),
            lookbehind: true,
            greedy: true,
          },
          {
            // https://docs.docker.com/engine/reference/builder/#from
            pattern: re(
              /(^(?:ONBUILD<SP>)?FROM<SP>(?:<OPT><SP>)*(?!--)[^ \t\\]+<SP>)AS/.source,
              'i'
            ),
            lookbehind: true,
            greedy: true,
          },
          {
            // https://docs.docker.com/engine/reference/builder/#onbuild
            pattern: re(/(^ONBUILD<SP>)\w+/.source, 'i'),
            lookbehind: true,
            greedy: true,
          },
          {
            pattern: /^\w+/,
            greedy: true,
          },
        ],
        comment: commentRule,
        string: stringRule,
        variable: /\$(?:\w+|\{[^{}"'\\]*\})/,
        operator: /\\$/m,
      },
    },
    comment: commentRule,
  };

  Prism.languages.dockerfile = Prism.languages.docker;
})(Prism);

Prism.languages.elixir = {
  doc: {
    pattern:
      /@(?:doc|moduledoc)\s+(?:("""|''')[\s\S]*?\1|("|')(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2)/,
    inside: {
      attribute: /^@\w+/,
      string: /['"][\s\S]+/,
    },
  },
  comment: {
    pattern: /#.*/,
    greedy: true,
  },
  // ~r"""foo""" (multi-line), ~r'''foo''' (multi-line), ~r/foo/, ~r|foo|, ~r"foo", ~r'foo', ~r(foo), ~r[foo], ~r{foo}, ~r<foo>
  regex: {
    pattern:
      /~[rR](?:("""|''')(?:\\[\s\S]|(?!\1)[^\\])+\1|([\/|"'])(?:\\.|(?!\2)[^\\\r\n])+\2|\((?:\\.|[^\\)\r\n])+\)|\[(?:\\.|[^\\\]\r\n])+\]|\{(?:\\.|[^\\}\r\n])+\}|<(?:\\.|[^\\>\r\n])+>)[uismxfr]*/,
    greedy: true,
  },
  string: [
    {
      // ~s"""foo""" (multi-line), ~s'''foo''' (multi-line), ~s/foo/, ~s|foo|, ~s"foo", ~s'foo', ~s(foo), ~s[foo], ~s{foo} (with interpolation care), ~s<foo>
      pattern:
        /~[cCsSwW](?:("""|''')(?:\\[\s\S]|(?!\1)[^\\])+\1|([\/|"'])(?:\\.|(?!\2)[^\\\r\n])+\2|\((?:\\.|[^\\)\r\n])+\)|\[(?:\\.|[^\\\]\r\n])+\]|\{(?:\\.|#\{[^}]+\}|#(?!\{)|[^#\\}\r\n])+\}|<(?:\\.|[^\\>\r\n])+>)[csa]?/,
      greedy: true,
      inside: {
        // See interpolation below
      },
    },
    {
      pattern: /("""|''')[\s\S]*?\1/,
      greedy: true,
      inside: {
        // See interpolation below
      },
    },
    {
      // Multi-line strings are allowed
      pattern: /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
      greedy: true,
      inside: {
        // See interpolation below
      },
    },
  ],
  atom: {
    // Look-behind prevents bad highlighting of the :: operator
    pattern: /(^|[^:]):\w+/,
    lookbehind: true,
    alias: 'symbol',
  },
  module: {
    pattern: /\b[A-Z]\w*\b/,
    alias: 'class-name',
  },
  // Look-ahead prevents bad highlighting of the :: operator
  'attr-name': /\b\w+\??:(?!:)/,
  argument: {
    // Look-behind prevents bad highlighting of the && operator
    pattern: /(^|[^&])&\d+/,
    lookbehind: true,
    alias: 'variable',
  },
  attribute: {
    pattern: /@\w+/,
    alias: 'variable',
  },
  function: /\b[_a-zA-Z]\w*[?!]?(?:(?=\s*(?:\.\s*)?\()|(?=\/\d))/,
  number: /\b(?:0[box][a-f\d_]+|\d[\d_]*)(?:\.[\d_]+)?(?:e[+-]?[\d_]+)?\b/i,
  keyword:
    /\b(?:after|alias|and|case|catch|cond|def(?:callback|delegate|exception|impl|macro|module|n|np|p|protocol|struct)?|do|else|end|fn|for|if|import|not|or|quote|raise|require|rescue|try|unless|unquote|use|when)\b/,
  boolean: /\b(?:false|nil|true)\b/,
  operator: [
    /\bin\b|&&?|\|[|>]?|\\\\|::|\.\.\.?|\+\+?|-[->]?|<[-=>]|>=|!==?|\B!|=(?:==?|[>~])?|[*\/^]/,
    {
      // We don't want to match <<
      pattern: /([^<])<(?!<)/,
      lookbehind: true,
    },
    {
      // We don't want to match >>
      pattern: /([^>])>(?!>)/,
      lookbehind: true,
    },
  ],
  punctuation: /<<|>>|[.,%\[\]{}()]/,
};

Prism.languages.elixir.string.forEach(function (o) {
  o.inside = {
    interpolation: {
      pattern: /#\{[^}]+\}/,
      inside: {
        delimiter: {
          pattern: /^#\{|\}$/,
          alias: 'punctuation',
        },
        rest: Prism.languages.elixir,
      },
    },
  };
});

Prism.languages.erlang = {
  comment: /%.+/,
  string: {
    pattern: /"(?:\\.|[^\\"\r\n])*"/,
    greedy: true,
  },
  'quoted-function': {
    pattern: /'(?:\\.|[^\\'\r\n])+'(?=\()/,
    alias: 'function',
  },
  'quoted-atom': {
    pattern: /'(?:\\.|[^\\'\r\n])+'/,
    alias: 'atom',
  },
  boolean: /\b(?:false|true)\b/,
  keyword: /\b(?:after|begin|case|catch|end|fun|if|of|receive|try|when)\b/,
  number: [/\$\\?./, /\b\d+#[a-z0-9]+/i, /(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i],
  function: /\b[a-z][\w@]*(?=\()/,
  variable: {
    // Look-behind is used to prevent wrong highlighting of atoms containing "@"
    pattern: /(^|[^@])(?:\b|\?)[A-Z_][\w@]*/,
    lookbehind: true,
  },
  operator: [
    /[=\/<>:]=|=[:\/]=|\+\+?|--?|[=*\/!]|\b(?:and|andalso|band|bnot|bor|bsl|bsr|bxor|div|not|or|orelse|rem|xor)\b/,
    {
      // We don't want to match <<
      pattern: /(^|[^<])<(?!<)/,
      lookbehind: true,
    },
    {
      // We don't want to match >>
      pattern: /(^|[^>])>(?!>)/,
      lookbehind: true,
    },
  ],
  atom: /\b[a-z][\w@]*/,
  punctuation: /[()[\]{}:;,.#|]|<<|>>/,
};

Prism.languages.fsharp = Prism.languages.extend('clike', {
  comment: [
    {
      pattern: /(^|[^\\])\(\*(?!\))[\s\S]*?\*\)/,
      lookbehind: true,
      greedy: true,
    },
    {
      pattern: /(^|[^\\:])\/\/.*/,
      lookbehind: true,
      greedy: true,
    },
  ],
  string: {
    pattern: /(?:"""[\s\S]*?"""|@"(?:""|[^"])*"|"(?:\\[\s\S]|[^\\"])*")B?/,
    greedy: true,
  },
  'class-name': {
    pattern:
      /(\b(?:exception|inherit|interface|new|of|type)\s+|\w\s*:\s*|\s:\??>\s*)[.\w]+\b(?:\s*(?:->|\*)\s*[.\w]+\b)*(?!\s*[:.])/,
    lookbehind: true,
    inside: {
      operator: /->|\*/,
      punctuation: /\./,
    },
  },
  keyword:
    /\b(?:let|return|use|yield)(?:!\B|\b)|\b(?:abstract|and|as|asr|assert|atomic|base|begin|break|checked|class|component|const|constraint|constructor|continue|default|delegate|do|done|downcast|downto|eager|elif|else|end|event|exception|extern|external|false|finally|fixed|for|fun|function|functor|global|if|in|include|inherit|inline|interface|internal|land|lazy|lor|lsl|lsr|lxor|match|member|method|mixin|mod|module|mutable|namespace|new|not|null|object|of|open|or|override|parallel|private|process|protected|public|pure|rec|sealed|select|sig|static|struct|tailcall|then|to|trait|true|try|type|upcast|val|virtual|void|volatile|when|while|with)\b/,
  number: [
    /\b0x[\da-fA-F]+(?:LF|lf|un)?\b/,
    /\b0b[01]+(?:uy|y)?\b/,
    /(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[fm]|e[+-]?\d+)?\b/i,
    /\b\d+(?:[IlLsy]|UL|u[lsy]?)?\b/,
  ],
  operator:
    /([<>~&^])\1\1|([*.:<>&])\2|<-|->|[!=:]=|<?\|{1,3}>?|\??(?:<=|>=|<>|[-+*/%=<>])\??|[!?^&]|~[+~-]|:>|:\?>?/,
});
Prism.languages.insertBefore('fsharp', 'keyword', {
  preprocessor: {
    pattern: /(^[\t ]*)#.*/m,
    lookbehind: true,
    alias: 'property',
    inside: {
      directive: {
        pattern: /(^#)\b(?:else|endif|if|light|line|nowarn)\b/,
        lookbehind: true,
        alias: 'keyword',
      },
    },
  },
});
Prism.languages.insertBefore('fsharp', 'punctuation', {
  'computation-expression': {
    pattern: /\b[_a-z]\w*(?=\s*\{)/i,
    alias: 'keyword',
  },
});
Prism.languages.insertBefore('fsharp', 'string', {
  annotation: {
    pattern: /\[<.+?>\]/,
    greedy: true,
    inside: {
      punctuation: /^\[<|>\]$/,
      'class-name': {
        pattern: /^\w+$|(^|;\s*)[A-Z]\w*(?=\()/,
        lookbehind: true,
      },
      'annotation-content': {
        pattern: /[\s\S]+/,
        inside: Prism.languages.fsharp,
      },
    },
  },
  char: {
    pattern: /'(?:[^\\']|\\(?:.|\d{3}|x[a-fA-F\d]{2}|u[a-fA-F\d]{4}|U[a-fA-F\d]{8}))'B?/,
    greedy: true,
  },
});

Prism.languages.fortran = {
  'quoted-number': {
    pattern: /[BOZ](['"])[A-F0-9]+\1/i,
    alias: 'number',
  },
  string: {
    pattern:
      /(?:\b\w+_)?(['"])(?:\1\1|&(?:\r\n?|\n)(?:[ \t]*!.*(?:\r\n?|\n)|(?![ \t]*!))|(?!\1).)*(?:\1|&)/,
    inside: {
      comment: {
        pattern: /(&(?:\r\n?|\n)\s*)!.*/,
        lookbehind: true,
      },
    },
  },
  comment: {
    pattern: /!.*/,
    greedy: true,
  },
  boolean: /\.(?:FALSE|TRUE)\.(?:_\w+)?/i,
  number: /(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[ED][+-]?\d+)?(?:_\w+)?/i,
  keyword: [
    // Types
    /\b(?:CHARACTER|COMPLEX|DOUBLE ?PRECISION|INTEGER|LOGICAL|REAL)\b/i,
    // END statements
    /\b(?:END ?)?(?:BLOCK ?DATA|DO|FILE|FORALL|FUNCTION|IF|INTERFACE|MODULE(?! PROCEDURE)|PROGRAM|SELECT|SUBROUTINE|TYPE|WHERE)\b/i,
    // Statements
    /\b(?:ALLOCATABLE|ALLOCATE|BACKSPACE|CALL|CASE|CLOSE|COMMON|CONTAINS|CONTINUE|CYCLE|DATA|DEALLOCATE|DIMENSION|DO|END|EQUIVALENCE|EXIT|EXTERNAL|FORMAT|GO ?TO|IMPLICIT(?: NONE)?|INQUIRE|INTENT|INTRINSIC|MODULE PROCEDURE|NAMELIST|NULLIFY|OPEN|OPTIONAL|PARAMETER|POINTER|PRINT|PRIVATE|PUBLIC|READ|RETURN|REWIND|SAVE|SELECT|STOP|TARGET|WHILE|WRITE)\b/i,
    // Others
    /\b(?:ASSIGNMENT|DEFAULT|ELEMENTAL|ELSE|ELSEIF|ELSEWHERE|ENTRY|IN|INCLUDE|INOUT|KIND|NULL|ONLY|OPERATOR|OUT|PURE|RECURSIVE|RESULT|SEQUENCE|STAT|THEN|USE)\b/i,
  ],
  operator: [
    /\*\*|\/\/|=>|[=\/]=|[<>]=?|::|[+\-*=%]|\.[A-Z]+\./i,
    {
      // Use lookbehind to prevent confusion with (/ /)
      pattern: /(^|(?!\().)\/(?!\))/,
      lookbehind: true,
    },
  ],
  punctuation: /\(\/|\/\)|[(),;:&]/,
};

Prism.languages.go = Prism.languages.extend('clike', {
  string: {
    pattern: /(^|[^\\])"(?:\\.|[^"\\\r\n])*"|`[^`]*`/,
    lookbehind: true,
    greedy: true,
  },
  keyword:
    /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go(?:to)?|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/,
  boolean: /\b(?:_|false|iota|nil|true)\b/,
  number: [
    // binary and octal integers
    /\b0(?:b[01_]+|o[0-7_]+)i?\b/i,
    // hexadecimal integers and floats
    /\b0x(?:[a-f\d_]+(?:\.[a-f\d_]*)?|\.[a-f\d_]+)(?:p[+-]?\d+(?:_\d+)*)?i?(?!\w)/i,
    // decimal integers and floats
    /(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?[\d_]+)?i?(?!\w)/i,
  ],
  operator: /[*\/%^!=]=?|\+[=+]?|-[=-]?|\|[=|]?|&(?:=|&|\^=?)?|>(?:>=?|=)?|<(?:<=?|=|-)?|:=|\.\.\./,
  builtin:
    /\b(?:append|bool|byte|cap|close|complex|complex(?:64|128)|copy|delete|error|float(?:32|64)|u?int(?:8|16|32|64)?|imag|len|make|new|panic|print(?:ln)?|real|recover|rune|string|uintptr)\b/,
});

Prism.languages.insertBefore('go', 'string', {
  char: {
    pattern: /'(?:\\.|[^'\\\r\n]){0,10}'/,
    greedy: true,
  },
});

delete Prism.languages.go['class-name'];

Prism.languages.graphql = {
  comment: /#.*/,
  description: {
    pattern: /(?:"""(?:[^"]|(?!""")")*"""|"(?:\\.|[^\\"\r\n])*")(?=\s*[a-z_])/i,
    greedy: true,
    alias: 'string',
    inside: {
      'language-markdown': {
        pattern: /(^"(?:"")?)(?!\1)[\s\S]+(?=\1$)/,
        lookbehind: true,
        inside: Prism.languages.markdown,
      },
    },
  },
  string: {
    pattern: /"""(?:[^"]|(?!""")")*"""|"(?:\\.|[^\\"\r\n])*"/,
    greedy: true,
  },
  number: /(?:\B-|\b)\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  boolean: /\b(?:false|true)\b/,
  variable: /\$[a-z_]\w*/i,
  directive: {
    pattern: /@[a-z_]\w*/i,
    alias: 'function',
  },
  'attr-name': {
    pattern: /\b[a-z_]\w*(?=\s*(?:\((?:[^()"]|"(?:\\.|[^\\"\r\n])*")*\))?:)/i,
    greedy: true,
  },
  'atom-input': {
    pattern: /\b[A-Z]\w*Input\b/,
    alias: 'class-name',
  },
  scalar: /\b(?:Boolean|Float|ID|Int|String)\b/,
  constant: /\b[A-Z][A-Z_\d]*\b/,
  'class-name': {
    pattern: /(\b(?:enum|implements|interface|on|scalar|type|union)\s+|&\s*|:\s*|\[)[A-Z_]\w*/,
    lookbehind: true,
  },
  fragment: {
    pattern: /(\bfragment\s+|\.{3}\s*(?!on\b))[a-zA-Z_]\w*/,
    lookbehind: true,
    alias: 'function',
  },
  'definition-mutation': {
    pattern: /(\bmutation\s+)[a-zA-Z_]\w*/,
    lookbehind: true,
    alias: 'function',
  },
  'definition-query': {
    pattern: /(\bquery\s+)[a-zA-Z_]\w*/,
    lookbehind: true,
    alias: 'function',
  },
  keyword:
    /\b(?:directive|enum|extend|fragment|implements|input|interface|mutation|on|query|repeatable|scalar|schema|subscription|type|union)\b/,
  operator: /[!=|&]|\.{3}/,
  'property-query': /\w+(?=\s*\()/,
  object: /\w+(?=\s*\{)/,
  punctuation: /[!(){}\[\]:=,]/,
  property: /\w+/,
};

Prism.hooks.add('after-tokenize', function afterTokenizeGraphql(env) {
  if (env.language !== 'graphql') {
    return;
  }

  /**
   * get the graphql token stream that we want to customize
   *
   * @typedef {InstanceType<import("./prism-core")["Token"]>} Token
   * @type {Token[]}
   */
  var validTokens = env.tokens.filter(function (token) {
    return typeof token !== 'string' && token.type !== 'comment' && token.type !== 'scalar';
  });

  var currentIndex = 0;

  /**
   * Returns whether the token relative to the current index has the given type.
   *
   * @param {number} offset
   * @returns {Token | undefined}
   */
  function getToken(offset) {
    return validTokens[currentIndex + offset];
  }

  /**
   * Returns whether the token relative to the current index has the given type.
   *
   * @param {readonly string[]} types
   * @param {number} [offset=0]
   * @returns {boolean}
   */
  function isTokenType(types, offset) {
    offset = offset || 0;
    for (var i = 0; i < types.length; i++) {
      var token = getToken(i + offset);
      if (!token || token.type !== types[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns the index of the closing bracket to an opening bracket.
   *
   * It is assumed that `token[currentIndex - 1]` is an opening bracket.
   *
   * If no closing bracket could be found, `-1` will be returned.
   *
   * @param {RegExp} open
   * @param {RegExp} close
   * @returns {number}
   */
  function findClosingBracket(open, close) {
    var stackHeight = 1;

    for (var i = currentIndex; i < validTokens.length; i++) {
      var token = validTokens[i];
      var content = token.content;

      if (token.type === 'punctuation' && typeof content === 'string') {
        if (open.test(content)) {
          stackHeight++;
        } else if (close.test(content)) {
          stackHeight--;

          if (stackHeight === 0) {
            return i;
          }
        }
      }
    }

    return -1;
  }

  /**
   * Adds an alias to the given token.
   *
   * @param {Token} token
   * @param {string} alias
   * @returns {void}
   */
  function addAlias(token, alias) {
    var aliases = token.alias;
    if (!aliases) {
      token.alias = aliases = [];
    } else if (!Array.isArray(aliases)) {
      token.alias = aliases = [aliases];
    }
    aliases.push(alias);
  }

  for (; currentIndex < validTokens.length; ) {
    var startToken = validTokens[currentIndex++];

    // add special aliases for mutation tokens
    if (startToken.type === 'keyword' && startToken.content === 'mutation') {
      // any array of the names of all input variables (if any)
      var inputVariables = [];

      if (isTokenType(['definition-mutation', 'punctuation']) && getToken(1).content === '(') {
        // definition

        currentIndex += 2; // skip 'definition-mutation' and 'punctuation'

        var definitionEnd = findClosingBracket(/^\($/, /^\)$/);
        if (definitionEnd === -1) {
          continue;
        }

        // find all input variables
        for (; currentIndex < definitionEnd; currentIndex++) {
          var t = getToken(0);
          if (t.type === 'variable') {
            addAlias(t, 'variable-input');
            inputVariables.push(t.content);
          }
        }

        currentIndex = definitionEnd + 1;
      }

      if (isTokenType(['punctuation', 'property-query']) && getToken(0).content === '{') {
        currentIndex++; // skip opening bracket

        addAlias(getToken(0), 'property-mutation');

        if (inputVariables.length > 0) {
          var mutationEnd = findClosingBracket(/^\{$/, /^\}$/);
          if (mutationEnd === -1) {
            continue;
          }

          // give references to input variables a special alias
          for (var i = currentIndex; i < mutationEnd; i++) {
            var varToken = validTokens[i];
            if (varToken.type === 'variable' && inputVariables.indexOf(varToken.content) >= 0) {
              addAlias(varToken, 'variable-input');
            }
          }
        }
      }
    }
  }
});

(function (Prism) {
  var interpolation = {
    pattern: /((?:^|[^\\$])(?:\\{2})*)\$(?:\w+|\{[^{}]*\})/,
    lookbehind: true,
    inside: {
      'interpolation-punctuation': {
        pattern: /^\$\{?|\}$/,
        alias: 'punctuation',
      },
      expression: {
        pattern: /[\s\S]+/,
        inside: null, // see below
      },
    },
  };

  Prism.languages.groovy = Prism.languages.extend('clike', {
    string: {
      // https://groovy-lang.org/syntax.html#_dollar_slashy_string
      pattern: /'''(?:[^\\]|\\[\s\S])*?'''|'(?:\\.|[^\\'\r\n])*'/,
      greedy: true,
    },
    keyword:
      /\b(?:abstract|as|assert|boolean|break|byte|case|catch|char|class|const|continue|def|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|in|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|trait|transient|try|void|volatile|while)\b/,
    number:
      /\b(?:0b[01_]+|0x[\da-f_]+(?:\.[\da-f_p\-]+)?|[\d_]+(?:\.[\d_]+)?(?:e[+-]?\d+)?)[glidf]?\b/i,
    operator: {
      pattern:
        /(^|[^.])(?:~|==?~?|\?[.:]?|\*(?:[.=]|\*=?)?|\.[@&]|\.\.<|\.\.(?!\.)|-[-=>]?|\+[+=]?|!=?|<(?:<=?|=>?)?|>(?:>>?=?|=)?|&[&=]?|\|[|=]?|\/=?|\^=?|%=?)/,
      lookbehind: true,
    },
    punctuation: /\.+|[{}[\];(),:$]/,
  });

  Prism.languages.insertBefore('groovy', 'string', {
    shebang: {
      pattern: /#!.+/,
      alias: 'comment',
      greedy: true,
    },
    'interpolation-string': {
      // TODO: Slash strings (e.g. /foo/) can contain line breaks but this will cause a lot of trouble with
      // simple division (see JS regex), so find a fix maybe?
      pattern:
        /"""(?:[^\\]|\\[\s\S])*?"""|(["/])(?:\\.|(?!\1)[^\\\r\n])*\1|\$\/(?:[^/$]|\$(?:[/$]|(?![/$]))|\/(?!\$))*\/\$/,
      greedy: true,
      inside: {
        interpolation: interpolation,
        string: /[\s\S]+/,
      },
    },
  });

  Prism.languages.insertBefore('groovy', 'punctuation', {
    'spock-block': /\b(?:and|cleanup|expect|given|setup|then|when|where):/,
  });

  Prism.languages.insertBefore('groovy', 'function', {
    annotation: {
      pattern: /(^|[^.])@\w+/,
      lookbehind: true,
      alias: 'punctuation',
    },
  });

  interpolation.inside.expression.inside = Prism.languages.groovy;
})(Prism);

Prism.languages.haskell = {
  comment: {
    pattern:
      /(^|[^-!#$%*+=?&@|~.:<>^\\\/])(?:--(?:(?=.)[^-!#$%*+=?&@|~.:<>^\\\/].*|$)|\{-[\s\S]*?-\})/m,
    lookbehind: true,
  },
  char: {
    pattern:
      /'(?:[^\\']|\\(?:[abfnrtv\\"'&]|\^[A-Z@[\]^_]|ACK|BEL|BS|CAN|CR|DC1|DC2|DC3|DC4|DEL|DLE|EM|ENQ|EOT|ESC|ETB|ETX|FF|FS|GS|HT|LF|NAK|NUL|RS|SI|SO|SOH|SP|STX|SUB|SYN|US|VT|\d+|o[0-7]+|x[0-9a-fA-F]+))'/,
    alias: 'string',
  },
  string: {
    pattern: /"(?:[^\\"]|\\(?:\S|\s+\\))*"/,
    greedy: true,
  },
  keyword:
    /\b(?:case|class|data|deriving|do|else|if|in|infixl|infixr|instance|let|module|newtype|of|primitive|then|type|where)\b/,
  'import-statement': {
    // The imported or hidden names are not included in this import
    // statement. This is because we want to highlight those exactly like
    // we do for the names in the program.
    pattern:
      /(^[\t ]*)import\s+(?:qualified\s+)?(?:[A-Z][\w']*)(?:\.[A-Z][\w']*)*(?:\s+as\s+(?:[A-Z][\w']*)(?:\.[A-Z][\w']*)*)?(?:\s+hiding\b)?/m,
    lookbehind: true,
    inside: {
      keyword: /\b(?:as|hiding|import|qualified)\b/,
      punctuation: /\./,
    },
  },
  // These are builtin variables only. Constructors are highlighted later as a constant.
  builtin:
    /\b(?:abs|acos|acosh|all|and|any|appendFile|approxRational|asTypeOf|asin|asinh|atan|atan2|atanh|basicIORun|break|catch|ceiling|chr|compare|concat|concatMap|const|cos|cosh|curry|cycle|decodeFloat|denominator|digitToInt|div|divMod|drop|dropWhile|either|elem|encodeFloat|enumFrom|enumFromThen|enumFromThenTo|enumFromTo|error|even|exp|exponent|fail|filter|flip|floatDigits|floatRadix|floatRange|floor|fmap|foldl|foldl1|foldr|foldr1|fromDouble|fromEnum|fromInt|fromInteger|fromIntegral|fromRational|fst|gcd|getChar|getContents|getLine|group|head|id|inRange|index|init|intToDigit|interact|ioError|isAlpha|isAlphaNum|isAscii|isControl|isDenormalized|isDigit|isHexDigit|isIEEE|isInfinite|isLower|isNaN|isNegativeZero|isOctDigit|isPrint|isSpace|isUpper|iterate|last|lcm|length|lex|lexDigits|lexLitChar|lines|log|logBase|lookup|map|mapM|mapM_|max|maxBound|maximum|maybe|min|minBound|minimum|mod|negate|not|notElem|null|numerator|odd|or|ord|otherwise|pack|pi|pred|primExitWith|print|product|properFraction|putChar|putStr|putStrLn|quot|quotRem|range|rangeSize|read|readDec|readFile|readFloat|readHex|readIO|readInt|readList|readLitChar|readLn|readOct|readParen|readSigned|reads|readsPrec|realToFrac|recip|rem|repeat|replicate|return|reverse|round|scaleFloat|scanl|scanl1|scanr|scanr1|seq|sequence|sequence_|show|showChar|showInt|showList|showLitChar|showParen|showSigned|showString|shows|showsPrec|significand|signum|sin|sinh|snd|sort|span|splitAt|sqrt|subtract|succ|sum|tail|take|takeWhile|tan|tanh|threadToIOResult|toEnum|toInt|toInteger|toLower|toRational|toUpper|truncate|uncurry|undefined|unlines|until|unwords|unzip|unzip3|userError|words|writeFile|zip|zip3|zipWith|zipWith3)\b/,
  // decimal integers and floating point numbers | octal integers | hexadecimal integers
  number: /\b(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?|0o[0-7]+|0x[0-9a-f]+)\b/i,
  operator: [
    {
      // infix operator
      pattern: /`(?:[A-Z][\w']*\.)*[_a-z][\w']*`/,
      greedy: true,
    },
    {
      // function composition
      pattern: /(\s)\.(?=\s)/,
      lookbehind: true,
    },
    // Most of this is needed because of the meaning of a single '.'.
    // If it stands alone freely, it is the function composition.
    // It may also be a separator between a module name and an identifier => no
    // operator. If it comes together with other special characters it is an
    // operator too.
    //
    // This regex means: /[-!#$%*+=?&@|~.:<>^\\\/]+/ without /\./.
    /[-!#$%*+=?&@|~:<>^\\\/][-!#$%*+=?&@|~.:<>^\\\/]*|\.[-!#$%*+=?&@|~.:<>^\\\/]+/,
  ],
  // In Haskell, nearly everything is a variable, do not highlight these.
  hvariable: {
    pattern: /\b(?:[A-Z][\w']*\.)*[_a-z][\w']*/,
    inside: {
      punctuation: /\./,
    },
  },
  constant: {
    pattern: /\b(?:[A-Z][\w']*\.)*[A-Z][\w']*/,
    inside: {
      punctuation: /\./,
    },
  },
  punctuation: /[{}[\];(),.:]/,
};

Prism.languages.hs = Prism.languages.haskell;

Prism.languages.haxe = Prism.languages.extend('clike', {
  string: {
    // Strings can be multi-line
    pattern: /"(?:[^"\\]|\\[\s\S])*"/,
    greedy: true,
  },
  'class-name': [
    {
      pattern: /(\b(?:abstract|class|enum|extends|implements|interface|new|typedef)\s+)[A-Z_]\w*/,
      lookbehind: true,
    },
    // based on naming convention
    /\b[A-Z]\w*/,
  ],
  // The final look-ahead prevents highlighting of keywords if expressions such as "haxe.macro.Expr"
  keyword:
    /\bthis\b|\b(?:abstract|as|break|case|cast|catch|class|continue|default|do|dynamic|else|enum|extends|extern|final|for|from|function|if|implements|import|in|inline|interface|macro|new|null|operator|overload|override|package|private|public|return|static|super|switch|throw|to|try|typedef|untyped|using|var|while)(?!\.)\b/,
  function: {
    pattern: /\b[a-z_]\w*(?=\s*(?:<[^<>]*>\s*)?\()/i,
    greedy: true,
  },
  operator: /\.{3}|\+\+|--|&&|\|\||->|=>|(?:<<?|>{1,3}|[-+*/%!=&|^])=?|[?:~]/,
});

Prism.languages.insertBefore('haxe', 'string', {
  'string-interpolation': {
    pattern: /'(?:[^'\\]|\\[\s\S])*'/,
    greedy: true,
    inside: {
      interpolation: {
        pattern: /(^|[^\\])\$(?:\w+|\{[^{}]+\})/,
        lookbehind: true,
        inside: {
          'interpolation-punctuation': {
            pattern: /^\$\{?|\}$/,
            alias: 'punctuation',
          },
          expression: {
            pattern: /[\s\S]+/,
            inside: Prism.languages.haxe,
          },
        },
      },
      string: /[\s\S]+/,
    },
  },
});

Prism.languages.insertBefore('haxe', 'class-name', {
  regex: {
    pattern: /~\/(?:[^\/\\\r\n]|\\.)+\/[a-z]*/,
    greedy: true,
    inside: {
      'regex-flags': /\b[a-z]+$/,
      'regex-source': {
        pattern: /^(~\/)[\s\S]+(?=\/$)/,
        lookbehind: true,
        alias: 'language-regex',
        inside: Prism.languages.regex,
      },
      'regex-delimiter': /^~\/|\/$/,
    },
  },
});

Prism.languages.insertBefore('haxe', 'keyword', {
  preprocessor: {
    pattern: /#(?:else|elseif|end|if)\b.*/,
    alias: 'property',
  },
  metadata: {
    pattern: /@:?[\w.]+/,
    alias: 'symbol',
  },
  reification: {
    pattern: /\$(?:\w+|(?=\{))/,
    alias: 'important',
  },
});

Prism.languages.ini = {
  /**
   * The component mimics the behavior of the Win32 API parser.
   *
   * @see {@link https://github.com/PrismJS/prism/issues/2775#issuecomment-787477723}
   */

  comment: {
    pattern: /(^[ \f\t\v]*)[#;][^\n\r]*/m,
    lookbehind: true,
  },
  section: {
    pattern: /(^[ \f\t\v]*)\[[^\n\r\]]*\]?/m,
    lookbehind: true,
    inside: {
      'section-name': {
        pattern: /(^\[[ \f\t\v]*)[^ \f\t\v\]]+(?:[ \f\t\v]+[^ \f\t\v\]]+)*/,
        lookbehind: true,
        alias: 'selector',
      },
      punctuation: /\[|\]/,
    },
  },
  key: {
    pattern: /(^[ \f\t\v]*)[^ \f\n\r\t\v=]+(?:[ \f\t\v]+[^ \f\n\r\t\v=]+)*(?=[ \f\t\v]*=)/m,
    lookbehind: true,
    alias: 'attr-name',
  },
  value: {
    pattern: /(=[ \f\t\v]*)[^ \f\n\r\t\v]+(?:[ \f\t\v]+[^ \f\n\r\t\v]+)*/,
    lookbehind: true,
    alias: 'attr-value',
    inside: {
      'inner-value': {
        pattern: /^("|').+(?=\1$)/,
        lookbehind: true,
      },
    },
  },
  punctuation: /=/,
};

(function (Prism) {
  var keywords =
    /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|module|native|new|non-sealed|null|open|opens|package|permits|private|protected|provides|public|record(?!\s*[(){}[\]<>=%~.:,;?+\-*/&|^])|requires|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|to|transient|transitive|try|uses|var|void|volatile|while|with|yield)\b/;

  // full package (optional) + parent classes (optional)
  var classNamePrefix = /(?:[a-z]\w*\s*\.\s*)*(?:[A-Z]\w*\s*\.\s*)*/.source;

  // based on the java naming conventions
  var className = {
    pattern: RegExp(/(^|[^\w.])/.source + classNamePrefix + /[A-Z](?:[\d_A-Z]*[a-z]\w*)?\b/.source),
    lookbehind: true,
    inside: {
      namespace: {
        pattern: /^[a-z]\w*(?:\s*\.\s*[a-z]\w*)*(?:\s*\.)?/,
        inside: {
          punctuation: /\./,
        },
      },
      punctuation: /\./,
    },
  };

  Prism.languages.java = Prism.languages.extend('clike', {
    string: {
      pattern: /(^|[^\\])"(?:\\.|[^"\\\r\n])*"/,
      lookbehind: true,
      greedy: true,
    },
    'class-name': [
      className,
      {
        // variables, parameters, and constructor references
        // this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
        pattern: RegExp(
          /(^|[^\w.])/.source +
            classNamePrefix +
            /[A-Z]\w*(?=\s+\w+\s*[;,=()]|\s*(?:\[[\s,]*\]\s*)?::\s*new\b)/.source
        ),
        lookbehind: true,
        inside: className.inside,
      },
      {
        // class names based on keyword
        // this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
        pattern: RegExp(
          /(\b(?:class|enum|extends|implements|instanceof|interface|new|record|throws)\s+)/.source +
            classNamePrefix +
            /[A-Z]\w*\b/.source
        ),
        lookbehind: true,
        inside: className.inside,
      },
    ],
    keyword: keywords,
    function: [
      Prism.languages.clike.function,
      {
        pattern: /(::\s*)[a-z_]\w*/,
        lookbehind: true,
      },
    ],
    number:
      /\b0b[01][01_]*L?\b|\b0x(?:\.[\da-f_p+-]+|[\da-f_]+(?:\.[\da-f_p+-]+)?)\b|(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i,
    operator: {
      pattern: /(^|[^.])(?:<<=?|>>>?=?|->|--|\+\+|&&|\|\||::|[?:~]|[-+*/%&|^!=<>]=?)/m,
      lookbehind: true,
    },
    constant: /\b[A-Z][A-Z_\d]+\b/,
  });

  Prism.languages.insertBefore('java', 'string', {
    'triple-quoted-string': {
      // http://openjdk.java.net/jeps/355#Description
      pattern: /"""[ \t]*[\r\n](?:(?:"|"")?(?:\\.|[^"\\]))*"""/,
      greedy: true,
      alias: 'string',
    },
    char: {
      pattern: /'(?:\\.|[^'\\\r\n]){1,6}'/,
      greedy: true,
    },
  });

  Prism.languages.insertBefore('java', 'class-name', {
    annotation: {
      pattern: /(^|[^.])@\w+(?:\s*\.\s*\w+)*/,
      lookbehind: true,
      alias: 'punctuation',
    },
    generics: {
      pattern:
        /<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&))*>)*>)*>)*>/,
      inside: {
        'class-name': className,
        keyword: keywords,
        punctuation: /[<>(),.:]/,
        operator: /[?&|]/,
      },
    },
    import: [
      {
        pattern: RegExp(
          /(\bimport\s+)/.source + classNamePrefix + /(?:[A-Z]\w*|\*)(?=\s*;)/.source
        ),
        lookbehind: true,
        inside: {
          namespace: className.inside.namespace,
          punctuation: /\./,
          operator: /\*/,
          'class-name': /\w+/,
        },
      },
      {
        pattern: RegExp(
          /(\bimport\s+static\s+)/.source + classNamePrefix + /(?:\w+|\*)(?=\s*;)/.source
        ),
        lookbehind: true,
        alias: 'static',
        inside: {
          namespace: className.inside.namespace,
          static: /\b\w+$/,
          punctuation: /\./,
          operator: /\*/,
          'class-name': /\w+/,
        },
      },
    ],
    namespace: {
      pattern: RegExp(
        /(\b(?:exports|import(?:\s+static)?|module|open|opens|package|provides|requires|to|transitive|uses|with)\s+)(?!<keyword>)[a-z]\w*(?:\.[a-z]\w*)*\.?/.source.replace(
          /<keyword>/g,
          function () {
            return keywords.source;
          }
        )
      ),
      lookbehind: true,
      inside: {
        punctuation: /\./,
      },
    },
  });
})(Prism);

// https://www.json.org/json-en.html
Prism.languages.json = {
  property: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
    lookbehind: true,
    greedy: true,
  },
  string: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    lookbehind: true,
    greedy: true,
  },
  comment: {
    pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
    greedy: true,
  },
  number: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  punctuation: /[{}[\],]/,
  operator: /:/,
  boolean: /\b(?:false|true)\b/,
  null: {
    pattern: /\bnull\b/,
    alias: 'keyword',
  },
};

Prism.languages.webmanifest = Prism.languages.json;

Prism.languages.julia = {
  comment: {
    // support one level of nested comments
    // https://github.com/JuliaLang/julia/pull/6128
    pattern: /(^|[^\\])(?:#=(?:[^#=]|=(?!#)|#(?!=)|#=(?:[^#=]|=(?!#)|#(?!=))*=#)*=#|#.*)/,
    lookbehind: true,
  },
  regex: {
    // https://docs.julialang.org/en/v1/manual/strings/#Regular-Expressions-1
    pattern: /r"(?:\\.|[^"\\\r\n])*"[imsx]{0,4}/,
    greedy: true,
  },
  string: {
    // https://docs.julialang.org/en/v1/manual/strings/#String-Basics-1
    // https://docs.julialang.org/en/v1/manual/strings/#non-standard-string-literals-1
    // https://docs.julialang.org/en/v1/manual/running-external-programs/#Running-External-Programs-1
    pattern: /"""[\s\S]+?"""|(?:\b\w+)?"(?:\\.|[^"\\\r\n])*"|`(?:[^\\`\r\n]|\\.)*`/,
    greedy: true,
  },
  char: {
    // https://docs.julialang.org/en/v1/manual/strings/#man-characters-1
    pattern: /(^|[^\w'])'(?:\\[^\r\n][^'\r\n]*|[^\\\r\n])'/,
    lookbehind: true,
    greedy: true,
  },
  keyword:
    /\b(?:abstract|baremodule|begin|bitstype|break|catch|ccall|const|continue|do|else|elseif|end|export|finally|for|function|global|if|immutable|import|importall|in|let|local|macro|module|print|println|quote|return|struct|try|type|typealias|using|while)\b/,
  boolean: /\b(?:false|true)\b/,
  number:
    /(?:\b(?=\d)|\B(?=\.))(?:0[box])?(?:[\da-f]+(?:_[\da-f]+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[efp][+-]?\d+(?:_\d+)*)?j?/i,
  // https://docs.julialang.org/en/v1/manual/mathematical-operations/
  // https://docs.julialang.org/en/v1/manual/mathematical-operations/#Operator-Precedence-and-Associativity-1
  operator:
    /&&|\|\||[-+*^%÷⊻&$\\]=?|\/[\/=]?|!=?=?|\|[=>]?|<(?:<=?|[=:|])?|>(?:=|>>?=?)?|==?=?|[~≠≤≥'√∛]/,
  punctuation: /::?|[{}[\]();,.?]/,
  // https://docs.julialang.org/en/v1/base/numbers/#Base.im
  constant: /\b(?:(?:Inf|NaN)(?:16|32|64)?|im|pi)\b|[πℯ]/,
};

(function (Prism) {
  Prism.languages.kotlin = Prism.languages.extend('clike', {
    keyword: {
      // The lookbehind prevents wrong highlighting of e.g. kotlin.properties.get
      pattern:
        /(^|[^.])\b(?:abstract|actual|annotation|as|break|by|catch|class|companion|const|constructor|continue|crossinline|data|do|dynamic|else|enum|expect|external|final|finally|for|fun|get|if|import|in|infix|init|inline|inner|interface|internal|is|lateinit|noinline|null|object|open|operator|out|override|package|private|protected|public|reified|return|sealed|set|super|suspend|tailrec|this|throw|to|try|typealias|val|var|vararg|when|where|while)\b/,
      lookbehind: true,
    },
    function: [
      {
        pattern: /(?:`[^\r\n`]+`|\b\w+)(?=\s*\()/,
        greedy: true,
      },
      {
        pattern: /(\.)(?:`[^\r\n`]+`|\w+)(?=\s*\{)/,
        lookbehind: true,
        greedy: true,
      },
    ],
    number:
      /\b(?:0[xX][\da-fA-F]+(?:_[\da-fA-F]+)*|0[bB][01]+(?:_[01]+)*|\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?(?:[eE][+-]?\d+(?:_\d+)*)?[fFL]?)\b/,
    operator:
      /\+[+=]?|-[-=>]?|==?=?|!(?:!|==?)?|[\/*%<>]=?|[?:]:?|\.\.|&&|\|\||\b(?:and|inv|or|shl|shr|ushr|xor)\b/,
  });

  delete Prism.languages.kotlin['class-name'];

  var interpolationInside = {
    'interpolation-punctuation': {
      pattern: /^\$\{?|\}$/,
      alias: 'punctuation',
    },
    expression: {
      pattern: /[\s\S]+/,
      inside: Prism.languages.kotlin,
    },
  };

  Prism.languages.insertBefore('kotlin', 'string', {
    // https://kotlinlang.org/spec/expressions.html#string-interpolation-expressions
    'string-literal': [
      {
        pattern: /"""(?:[^$]|\$(?:(?!\{)|\{[^{}]*\}))*?"""/,
        alias: 'multiline',
        inside: {
          interpolation: {
            pattern: /\$(?:[a-z_]\w*|\{[^{}]*\})/i,
            inside: interpolationInside,
          },
          string: /[\s\S]+/,
        },
      },
      {
        pattern: /"(?:[^"\\\r\n$]|\\.|\$(?:(?!\{)|\{[^{}]*\}))*"/,
        alias: 'singleline',
        inside: {
          interpolation: {
            pattern: /((?:^|[^\\])(?:\\{2})*)\$(?:[a-z_]\w*|\{[^{}]*\})/i,
            lookbehind: true,
            inside: interpolationInside,
          },
          string: /[\s\S]+/,
        },
      },
    ],
    char: {
      // https://kotlinlang.org/spec/expressions.html#character-literals
      pattern: /'(?:[^'\\\r\n]|\\(?:.|u[a-fA-F0-9]{0,4}))'/,
      greedy: true,
    },
  });

  delete Prism.languages.kotlin['string'];

  Prism.languages.insertBefore('kotlin', 'keyword', {
    annotation: {
      pattern: /\B@(?:\w+:)?(?:[A-Z]\w*|\[[^\]]+\])/,
      alias: 'builtin',
    },
  });

  Prism.languages.insertBefore('kotlin', 'function', {
    label: {
      pattern: /\b\w+@|@\w+\b/,
      alias: 'symbol',
    },
  });

  Prism.languages.kt = Prism.languages.kotlin;
  Prism.languages.kts = Prism.languages.kotlin;
})(Prism);

(function (Prism) {
  var funcPattern = /\\(?:[^a-z()[\]]|[a-z*]+)/i;
  var insideEqu = {
    'equation-command': {
      pattern: funcPattern,
      alias: 'regex',
    },
  };

  Prism.languages.latex = {
    comment: /%.*/,
    // the verbatim environment prints whitespace to the document
    cdata: {
      pattern: /(\\begin\{((?:lstlisting|verbatim)\*?)\})[\s\S]*?(?=\\end\{\2\})/,
      lookbehind: true,
    },
    /*
     * equations can be between $$ $$ or $ $ or \( \) or \[ \]
     * (all are multiline)
     */
    equation: [
      {
        pattern:
          /\$\$(?:\\[\s\S]|[^\\$])+\$\$|\$(?:\\[\s\S]|[^\\$])+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/,
        inside: insideEqu,
        alias: 'string',
      },
      {
        pattern:
          /(\\begin\{((?:align|eqnarray|equation|gather|math|multline)\*?)\})[\s\S]*?(?=\\end\{\2\})/,
        lookbehind: true,
        inside: insideEqu,
        alias: 'string',
      },
    ],
    /*
     * arguments which are keywords or references are highlighted
     * as keywords
     */
    keyword: {
      pattern:
        /(\\(?:begin|cite|documentclass|end|label|ref|usepackage)(?:\[[^\]]+\])?\{)[^}]+(?=\})/,
      lookbehind: true,
    },
    url: {
      pattern: /(\\url\{)[^}]+(?=\})/,
      lookbehind: true,
    },
    /*
     * section or chapter headlines are highlighted as bold so that
     * they stand out more
     */
    headline: {
      pattern:
        /(\\(?:chapter|frametitle|paragraph|part|section|subparagraph|subsection|subsubparagraph|subsubsection|subsubsubparagraph)\*?(?:\[[^\]]+\])?\{)[^}]+(?=\})/,
      lookbehind: true,
      alias: 'class-name',
    },
    function: {
      pattern: funcPattern,
      alias: 'selector',
    },
    punctuation: /[[\]{}&]/,
  };

  Prism.languages.tex = Prism.languages.latex;
  Prism.languages.context = Prism.languages.latex;
})(Prism);

Prism.languages.lua = {
  comment: /^#!.+|--(?:\[(=*)\[[\s\S]*?\]\1\]|.*)/m,
  // \z may be used to skip the following space
  string: {
    pattern: /(["'])(?:(?!\1)[^\\\r\n]|\\z(?:\r\n|\s)|\\(?:\r\n|[^z]))*\1|\[(=*)\[[\s\S]*?\]\2\]/,
    greedy: true,
  },
  number:
    /\b0x[a-f\d]+(?:\.[a-f\d]*)?(?:p[+-]?\d+)?\b|\b\d+(?:\.\B|(?:\.\d*)?(?:e[+-]?\d+)?\b)|\B\.\d+(?:e[+-]?\d+)?\b/i,
  keyword:
    /\b(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/,
  function: /(?!\d)\w+(?=\s*(?:[({]))/,
  operator: [
    /[-+*%^&|#]|\/\/?|<[<=]?|>[>=]?|[=~]=?/,
    {
      // Match ".." but don't break "..."
      pattern: /(^|[^.])\.\.(?!\.)/,
      lookbehind: true,
    },
  ],
  punctuation: /[\[\](){},;]|\.+|:+/,
};

Prism.languages.makefile = {
  comment: {
    pattern: /(^|[^\\])#(?:\\(?:\r\n|[\s\S])|[^\\\r\n])*/,
    lookbehind: true,
  },
  string: {
    pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true,
  },

  'builtin-target': {
    pattern: /\.[A-Z][^:#=\s]+(?=\s*:(?!=))/,
    alias: 'builtin',
  },

  target: {
    pattern: /^(?:[^:=\s]|[ \t]+(?![\s:]))+(?=\s*:(?!=))/m,
    alias: 'symbol',
    inside: {
      variable: /\$+(?:(?!\$)[^(){}:#=\s]+|(?=[({]))/,
    },
  },
  variable: /\$+(?:(?!\$)[^(){}:#=\s]+|\([@*%<^+?][DF]\)|(?=[({]))/,

  // Directives
  keyword:
    /-include\b|\b(?:define|else|endef|endif|export|ifn?def|ifn?eq|include|override|private|sinclude|undefine|unexport|vpath)\b/,

  function: {
    pattern:
      /(\()(?:abspath|addsuffix|and|basename|call|dir|error|eval|file|filter(?:-out)?|findstring|firstword|flavor|foreach|guile|if|info|join|lastword|load|notdir|or|origin|patsubst|realpath|shell|sort|strip|subst|suffix|value|warning|wildcard|word(?:list|s)?)(?=[ \t])/,
    lookbehind: true,
  },
  operator: /(?:::|[?:+!])?=|[|@]/,
  punctuation: /[:;(){}]/,
};

(function (Prism) {
  // Allow only one line break
  var inner = /(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/.source;

  /**
   * This function is intended for the creation of the bold or italic pattern.
   *
   * This also adds a lookbehind group to the given pattern to ensure that the pattern is not backslash-escaped.
   *
   * _Note:_ Keep in mind that this adds a capturing group.
   *
   * @param {string} pattern
   * @returns {RegExp}
   */
  function createInline(pattern) {
    pattern = pattern.replace(/<inner>/g, function () {
      return inner;
    });
    return RegExp(/((?:^|[^\\])(?:\\{2})*)/.source + '(?:' + pattern + ')');
  }

  var tableCell = /(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source;
  var tableRow = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g, function () {
    return tableCell;
  });
  var tableLine = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;

  Prism.languages.markdown = Prism.languages.extend('markup', {});
  Prism.languages.insertBefore('markdown', 'prolog', {
    'front-matter-block': {
      pattern: /(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,
      lookbehind: true,
      greedy: true,
      inside: {
        punctuation: /^---|---$/,
        'front-matter': {
          pattern: /\S+(?:\s+\S+)*/,
          alias: ['yaml', 'language-yaml'],
          inside: Prism.languages.yaml,
        },
      },
    },
    blockquote: {
      // > ...
      pattern: /^>(?:[\t ]*>)*/m,
      alias: 'punctuation',
    },
    table: {
      pattern: RegExp('^' + tableRow + tableLine + '(?:' + tableRow + ')*', 'm'),
      inside: {
        'table-data-rows': {
          pattern: RegExp('^(' + tableRow + tableLine + ')(?:' + tableRow + ')*$'),
          lookbehind: true,
          inside: {
            'table-data': {
              pattern: RegExp(tableCell),
              inside: Prism.languages.markdown,
            },
            punctuation: /\|/,
          },
        },
        'table-line': {
          pattern: RegExp('^(' + tableRow + ')' + tableLine + '$'),
          lookbehind: true,
          inside: {
            punctuation: /\||:?-{3,}:?/,
          },
        },
        'table-header-row': {
          pattern: RegExp('^' + tableRow + '$'),
          inside: {
            'table-header': {
              pattern: RegExp(tableCell),
              alias: 'important',
              inside: Prism.languages.markdown,
            },
            punctuation: /\|/,
          },
        },
      },
    },
    code: [
      {
        // Prefixed by 4 spaces or 1 tab and preceded by an empty line
        pattern:
          /((?:^|\n)[ \t]*\n|(?:^|\r\n?)[ \t]*\r\n?)(?: {4}|\t).+(?:(?:\n|\r\n?)(?: {4}|\t).+)*/,
        lookbehind: true,
        alias: 'keyword',
      },
      {
        // ```optional language
        // code block
        // ```
        pattern: /^```[\s\S]*?^```$/m,
        greedy: true,
        inside: {
          'code-block': {
            pattern: /^(```.*(?:\n|\r\n?))[\s\S]+?(?=(?:\n|\r\n?)^```$)/m,
            lookbehind: true,
          },
          'code-language': {
            pattern: /^(```).+/,
            lookbehind: true,
          },
          punctuation: /```/,
        },
      },
    ],
    title: [
      {
        // title 1
        // =======

        // title 2
        // -------
        pattern: /\S.*(?:\n|\r\n?)(?:==+|--+)(?=[ \t]*$)/m,
        alias: 'important',
        inside: {
          punctuation: /==+$|--+$/,
        },
      },
      {
        // # title 1
        // ###### title 6
        pattern: /(^\s*)#.+/m,
        lookbehind: true,
        alias: 'important',
        inside: {
          punctuation: /^#+|#+$/,
        },
      },
    ],
    hr: {
      // ***
      // ---
      // * * *
      // -----------
      pattern: /(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,
      lookbehind: true,
      alias: 'punctuation',
    },
    list: {
      // * item
      // + item
      // - item
      // 1. item
      pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
      lookbehind: true,
      alias: 'punctuation',
    },
    'url-reference': {
      // [id]: http://example.com "Optional title"
      // [id]: http://example.com 'Optional title'
      // [id]: http://example.com (Optional title)
      // [id]: <http://example.com> "Optional title"
      pattern:
        /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
      inside: {
        variable: {
          pattern: /^(!?\[)[^\]]+/,
          lookbehind: true,
        },
        string: /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
        punctuation: /^[\[\]!:]|[<>]/,
      },
      alias: 'url',
    },
    bold: {
      // **strong**
      // __strong__

      // allow one nested instance of italic text using the same delimiter
      pattern: createInline(
        /\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\b|\*\*(?:(?!\*)<inner>|\*(?:(?!\*)<inner>)+\*)+\*\*/
          .source
      ),
      lookbehind: true,
      greedy: true,
      inside: {
        content: {
          pattern: /(^..)[\s\S]+(?=..$)/,
          lookbehind: true,
          inside: {}, // see below
        },
        punctuation: /\*\*|__/,
      },
    },
    italic: {
      // *em*
      // _em_

      // allow one nested instance of bold text using the same delimiter
      pattern: createInline(
        /\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\b|\*(?:(?!\*)<inner>|\*\*(?:(?!\*)<inner>)+\*\*)+\*/
          .source
      ),
      lookbehind: true,
      greedy: true,
      inside: {
        content: {
          pattern: /(^.)[\s\S]+(?=.$)/,
          lookbehind: true,
          inside: {}, // see below
        },
        punctuation: /[*_]/,
      },
    },
    strike: {
      // ~~strike through~~
      // ~strike~
      // eslint-disable-next-line regexp/strict
      pattern: createInline(/(~~?)(?:(?!~)<inner>)+\2/.source),
      lookbehind: true,
      greedy: true,
      inside: {
        content: {
          pattern: /(^~~?)[\s\S]+(?=\1$)/,
          lookbehind: true,
          inside: {}, // see below
        },
        punctuation: /~~?/,
      },
    },
    'code-snippet': {
      // `code`
      // ``code``
      pattern: /(^|[^\\`])(?:``[^`\r\n]+(?:`[^`\r\n]+)*``(?!`)|`[^`\r\n]+`(?!`))/,
      lookbehind: true,
      greedy: true,
      alias: ['code', 'keyword'],
    },
    url: {
      // [example](http://example.com "Optional title")
      // [example][id]
      // [example] [id]
      pattern: createInline(
        /!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)|[ \t]?\[(?:(?!\])<inner>)+\])/
          .source
      ),
      lookbehind: true,
      greedy: true,
      inside: {
        operator: /^!/,
        content: {
          pattern: /(^\[)[^\]]+(?=\])/,
          lookbehind: true,
          inside: {}, // see below
        },
        variable: {
          pattern: /(^\][ \t]?\[)[^\]]+(?=\]$)/,
          lookbehind: true,
        },
        url: {
          pattern: /(^\]\()[^\s)]+/,
          lookbehind: true,
        },
        string: {
          pattern: /(^[ \t]+)"(?:\\.|[^"\\])*"(?=\)$)/,
          lookbehind: true,
        },
      },
    },
  });

  ['url', 'bold', 'italic', 'strike'].forEach(function (token) {
    ['url', 'bold', 'italic', 'strike', 'code-snippet'].forEach(function (inside) {
      if (token !== inside) {
        Prism.languages.markdown[token].inside.content.inside[inside] =
          Prism.languages.markdown[inside];
      }
    });
  });

  Prism.hooks.add('after-tokenize', function (env) {
    if (env.language !== 'markdown' && env.language !== 'md') {
      return;
    }

    function walkTokens(tokens) {
      if (!tokens || typeof tokens === 'string') {
        return;
      }

      for (var i = 0, l = tokens.length; i < l; i++) {
        var token = tokens[i];

        if (token.type !== 'code') {
          walkTokens(token.content);
          continue;
        }

        /*
         * Add the correct `language-xxxx` class to this code block. Keep in mind that the `code-language` token
         * is optional. But the grammar is defined so that there is only one case we have to handle:
         *
         * token.content = [
         *     <span class="punctuation">```</span>,
         *     <span class="code-language">xxxx</span>,
         *     '\n', // exactly one new lines (\r or \n or \r\n)
         *     <span class="code-block">...</span>,
         *     '\n', // exactly one new lines again
         *     <span class="punctuation">```</span>
         * ];
         */

        var codeLang = token.content[1];
        var codeBlock = token.content[3];

        if (
          codeLang &&
          codeBlock &&
          codeLang.type === 'code-language' &&
          codeBlock.type === 'code-block' &&
          typeof codeLang.content === 'string'
        ) {
          // this might be a language that Prism does not support

          // do some replacements to support C++, C#, and F#
          var lang = codeLang.content.replace(/\b#/g, 'sharp').replace(/\b\+\+/g, 'pp');
          // only use the first word
          lang = (/[a-z][\w-]*/i.exec(lang) || [''])[0].toLowerCase();
          var alias = 'language-' + lang;

          // add alias
          if (!codeBlock.alias) {
            codeBlock.alias = [alias];
          } else if (typeof codeBlock.alias === 'string') {
            codeBlock.alias = [codeBlock.alias, alias];
          } else {
            codeBlock.alias.push(alias);
          }
        }
      }
    }

    walkTokens(env.tokens);
  });

  Prism.hooks.add('wrap', function (env) {
    if (env.type !== 'code-block') {
      return;
    }

    var codeLang = '';
    for (var i = 0, l = env.classes.length; i < l; i++) {
      var cls = env.classes[i];
      var match = /language-(.+)/.exec(cls);
      if (match) {
        codeLang = match[1];
        break;
      }
    }

    var grammar = Prism.languages[codeLang];

    if (!grammar) {
      if (codeLang && codeLang !== 'none' && Prism.plugins.autoloader) {
        var id = 'md-' + new Date().valueOf() + '-' + Math.floor(Math.random() * 1e16);
        env.attributes['id'] = id;

        Prism.plugins.autoloader.loadLanguages(codeLang, function () {
          var ele = document.getElementById(id);
          if (ele) {
            ele.innerHTML = Prism.highlight(ele.textContent, Prism.languages[codeLang], codeLang);
          }
        });
      }
    } else {
      env.content = Prism.highlight(textContent(env.content), grammar, codeLang);
    }
  });

  var tagPattern = RegExp(Prism.languages.markup.tag.pattern.source, 'gi');

  /**
   * A list of known entity names.
   *
   * This will always be incomplete to save space. The current list is the one used by lowdash's unescape function.
   *
   * @see {@link https://github.com/lodash/lodash/blob/2da024c3b4f9947a48517639de7560457cd4ec6c/unescape.js#L2}
   */
  var KNOWN_ENTITY_NAMES = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
  };

  // IE 11 doesn't support `String.fromCodePoint`
  var fromCodePoint = String.fromCodePoint || String.fromCharCode;

  /**
   * Returns the text content of a given HTML source code string.
   *
   * @param {string} html
   * @returns {string}
   */
  function textContent(html) {
    // remove all tags
    var text = html.replace(tagPattern, '');

    // decode known entities
    text = text.replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi, function (m, code) {
      code = code.toLowerCase();

      if (code[0] === '#') {
        var value;
        if (code[1] === 'x') {
          value = parseInt(code.slice(2), 16);
        } else {
          value = Number(code.slice(1));
        }

        return fromCodePoint(value);
      } else {
        var known = KNOWN_ENTITY_NAMES[code];
        if (known) {
          return known;
        }

        // unable to decode
        return m;
      }
    });

    return text;
  }

  Prism.languages.md = Prism.languages.markdown;
})(Prism);

(function (Prism) {
  /**
   * Returns the placeholder for the given language id and index.
   *
   * @param {string} language
   * @param {string|number} index
   * @returns {string}
   */
  function getPlaceholder(language, index) {
    return '___' + language.toUpperCase() + index + '___';
  }

  Object.defineProperties((Prism.languages['markup-templating'] = {}), {
    buildPlaceholders: {
      /**
       * Tokenize all inline templating expressions matching `placeholderPattern`.
       *
       * If `replaceFilter` is provided, only matches of `placeholderPattern` for which `replaceFilter` returns
       * `true` will be replaced.
       *
       * @param {object} env The environment of the `before-tokenize` hook.
       * @param {string} language The language id.
       * @param {RegExp} placeholderPattern The matches of this pattern will be replaced by placeholders.
       * @param {(match: string) => boolean} [replaceFilter]
       */
      value: function (env, language, placeholderPattern, replaceFilter) {
        if (env.language !== language) {
          return;
        }

        var tokenStack = (env.tokenStack = []);

        env.code = env.code.replace(placeholderPattern, function (match) {
          if (typeof replaceFilter === 'function' && !replaceFilter(match)) {
            return match;
          }
          var i = tokenStack.length;
          var placeholder;

          // Check for existing strings
          while (env.code.indexOf((placeholder = getPlaceholder(language, i))) !== -1) {
            ++i;
          }

          // Create a sparse array
          tokenStack[i] = match;

          return placeholder;
        });

        // Switch the grammar to markup
        env.grammar = Prism.languages.markup;
      },
    },
    tokenizePlaceholders: {
      /**
       * Replace placeholders with proper tokens after tokenizing.
       *
       * @param {object} env The environment of the `after-tokenize` hook.
       * @param {string} language The language id.
       */
      value: function (env, language) {
        if (env.language !== language || !env.tokenStack) {
          return;
        }

        // Switch the grammar back
        env.grammar = Prism.languages[language];

        var j = 0;
        var keys = Object.keys(env.tokenStack);

        function walkTokens(tokens) {
          for (var i = 0; i < tokens.length; i++) {
            // all placeholders are replaced already
            if (j >= keys.length) {
              break;
            }

            var token = tokens[i];
            if (typeof token === 'string' || (token.content && typeof token.content === 'string')) {
              var k = keys[j];
              var t = env.tokenStack[k];
              var s = typeof token === 'string' ? token : token.content;
              var placeholder = getPlaceholder(language, k);

              var index = s.indexOf(placeholder);
              if (index > -1) {
                ++j;

                var before = s.substring(0, index);
                var middle = new Prism.Token(
                  language,
                  Prism.tokenize(t, env.grammar),
                  'language-' + language,
                  t
                );
                var after = s.substring(index + placeholder.length);

                var replacement = [];
                if (before) {
                  replacement.push.apply(replacement, walkTokens([before]));
                }
                replacement.push(middle);
                if (after) {
                  replacement.push.apply(replacement, walkTokens([after]));
                }

                if (typeof token === 'string') {
                  tokens.splice.apply(tokens, [i, 1].concat(replacement));
                } else {
                  token.content = replacement;
                }
              }
            } else if (token.content /* && typeof token.content !== 'string' */) {
              walkTokens(token.content);
            }
          }

          return tokens;
        }

        walkTokens(env.tokens);
      },
    },
  });
})(Prism);

// https://www.stata.com/manuals/m.pdf

(function (Prism) {
  var orgType = /\b(?:(?:col|row)?vector|matrix|scalar)\b/.source;
  var type =
    /\bvoid\b|<org>|\b(?:complex|numeric|pointer(?:\s*\([^()]*\))?|real|string|(?:class|struct)\s+\w+|transmorphic)(?:\s*<org>)?/.source.replace(
      /<org>/g,
      orgType
    );

  Prism.languages.mata = {
    comment: {
      pattern: /\/\/.*|\/\*(?:[^*/]|\*(?!\/)|\/(?!\*)|\/\*(?:[^*]|\*(?!\/))*\*\/)*\*\//,
      greedy: true,
    },
    string: {
      pattern: /"[^"\r\n]*"|[‘`']".*?"[’`']/,
      greedy: true,
    },

    'class-name': {
      pattern: /(\b(?:class|extends|struct)\s+)\w+(?=\s*(?:\{|\bextends\b))/,
      lookbehind: true,
    },
    type: {
      pattern: RegExp(type),
      alias: 'class-name',
      inside: {
        punctuation: /[()]/,
        keyword: /\b(?:class|function|struct|void)\b/,
      },
    },
    keyword:
      /\b(?:break|class|continue|do|else|end|extends|external|final|for|function|goto|if|pragma|private|protected|public|return|static|struct|unset|unused|version|virtual|while)\b/,
    constant: /\bNULL\b/,

    number: {
      pattern:
        /(^|[^\w.])(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?|\d[a-f0-9]*(?:\.[a-f0-9]+)?x[+-]?\d+)i?(?![\w.])/i,
      lookbehind: true,
    },
    missing: {
      pattern: /(^|[^\w.])(?:\.[a-z]?)(?![\w.])/,
      lookbehind: true,
      alias: 'symbol',
    },

    function: /\b[a-z_]\w*(?=\s*\()/i,

    operator: /\.\.|\+\+|--|&&|\|\||:?(?:[!=<>]=|[+\-*/^<>&|:])|[!?=\\#’`']/,
    punctuation: /[()[\]{},;.]/,
  };
})(Prism);

Prism.languages.matlab = {
  comment: [/%\{[\s\S]*?\}%/, /%.+/],
  string: {
    pattern: /\B'(?:''|[^'\r\n])*'/,
    greedy: true,
  },
  // FIXME We could handle imaginary numbers as a whole
  number: /(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[eE][+-]?\d+)?(?:[ij])?|\b[ij]\b/,
  keyword:
    /\b(?:NaN|break|case|catch|continue|else|elseif|end|for|function|if|inf|otherwise|parfor|pause|pi|return|switch|try|while)\b/,
  function: /\b(?!\d)\w+(?=\s*\()/,
  operator: /\.?[*^\/\\']|[+\-:@]|[<>=~]=?|&&?|\|\|?/,
  punctuation: /\.{3}|[.,;\[\](){}!]/,
};

Prism.languages.objectivec = Prism.languages.extend('c', {
  string: {
    pattern: /@?"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"/,
    greedy: true,
  },
  keyword:
    /\b(?:asm|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|in|inline|int|long|register|return|self|short|signed|sizeof|static|struct|super|switch|typedef|typeof|union|unsigned|void|volatile|while)\b|(?:@interface|@end|@implementation|@protocol|@class|@public|@protected|@private|@property|@try|@catch|@finally|@throw|@synthesize|@dynamic|@selector)\b/,
  operator: /-[->]?|\+\+?|!=?|<<?=?|>>?=?|==?|&&?|\|\|?|[~^%?*\/@]/,
});

delete Prism.languages.objectivec['class-name'];

Prism.languages.objc = Prism.languages.objectivec;

(function (Prism) {
  var brackets =
    /(?:\((?:[^()\\]|\\[\s\S])*\)|\{(?:[^{}\\]|\\[\s\S])*\}|\[(?:[^[\]\\]|\\[\s\S])*\]|<(?:[^<>\\]|\\[\s\S])*>)/
      .source;

  Prism.languages.perl = {
    comment: [
      {
        // POD
        pattern: /(^\s*)=\w[\s\S]*?=cut.*/m,
        lookbehind: true,
        greedy: true,
      },
      {
        pattern: /(^|[^\\$])#.*/,
        lookbehind: true,
        greedy: true,
      },
    ],
    // TODO Could be nice to handle Heredoc too.
    string: [
      {
        pattern: RegExp(
          /\b(?:q|qq|qw|qx)(?![a-zA-Z0-9])\s*/.source +
            '(?:' +
            [
              // q/.../
              /([^a-zA-Z0-9\s{(\[<])(?:(?!\1)[^\\]|\\[\s\S])*\1/.source,

              // q a...a
              // eslint-disable-next-line regexp/strict
              /([a-zA-Z0-9])(?:(?!\2)[^\\]|\\[\s\S])*\2/.source,

              // q(...)
              // q{...}
              // q[...]
              // q<...>
              brackets,
            ].join('|') +
            ')'
        ),
        greedy: true,
      },

      // "...", `...`
      {
        pattern: /("|`)(?:(?!\1)[^\\]|\\[\s\S])*\1/,
        greedy: true,
      },

      // '...'
      // FIXME Multi-line single-quoted strings are not supported as they would break variables containing '
      {
        pattern: /'(?:[^'\\\r\n]|\\.)*'/,
        greedy: true,
      },
    ],
    regex: [
      {
        pattern: RegExp(
          /\b(?:m|qr)(?![a-zA-Z0-9])\s*/.source +
            '(?:' +
            [
              // m/.../
              /([^a-zA-Z0-9\s{(\[<])(?:(?!\1)[^\\]|\\[\s\S])*\1/.source,

              // m a...a
              // eslint-disable-next-line regexp/strict
              /([a-zA-Z0-9])(?:(?!\2)[^\\]|\\[\s\S])*\2/.source,

              // m(...)
              // m{...}
              // m[...]
              // m<...>
              brackets,
            ].join('|') +
            ')' +
            /[msixpodualngc]*/.source
        ),
        greedy: true,
      },

      // The lookbehinds prevent -s from breaking
      {
        pattern: RegExp(
          /(^|[^-])\b(?:s|tr|y)(?![a-zA-Z0-9])\s*/.source +
            '(?:' +
            [
              // s/.../.../
              // eslint-disable-next-line regexp/strict
              /([^a-zA-Z0-9\s{(\[<])(?:(?!\2)[^\\]|\\[\s\S])*\2(?:(?!\2)[^\\]|\\[\s\S])*\2/.source,

              // s a...a...a
              // eslint-disable-next-line regexp/strict
              /([a-zA-Z0-9])(?:(?!\3)[^\\]|\\[\s\S])*\3(?:(?!\3)[^\\]|\\[\s\S])*\3/.source,

              // s(...)(...)
              // s{...}{...}
              // s[...][...]
              // s<...><...>
              // s(...)[...]
              brackets + /\s*/.source + brackets,
            ].join('|') +
            ')' +
            /[msixpodualngcer]*/.source
        ),
        lookbehind: true,
        greedy: true,
      },

      // /.../
      // The look-ahead tries to prevent two divisions on
      // the same line from being highlighted as regex.
      // This does not support multi-line regex.
      {
        pattern:
          /\/(?:[^\/\\\r\n]|\\.)*\/[msixpodualngc]*(?=\s*(?:$|[\r\n,.;})&|\-+*~<>!?^]|(?:and|cmp|eq|ge|gt|le|lt|ne|not|or|x|xor)\b))/,
        greedy: true,
      },
    ],

    // FIXME Not sure about the handling of ::, ', and #
    variable: [
      // ${^POSTMATCH}
      /[&*$@%]\{\^[A-Z]+\}/,
      // $^V
      /[&*$@%]\^[A-Z_]/,
      // ${...}
      /[&*$@%]#?(?=\{)/,
      // $foo
      /[&*$@%]#?(?:(?:::)*'?(?!\d)[\w$]+(?![\w$]))+(?:::)*/,
      // $1
      /[&*$@%]\d+/,
      // $_, @_, %!
      // The negative lookahead prevents from breaking the %= operator
      /(?!%=)[$@%][!"#$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~]/,
    ],
    filehandle: {
      // <>, <FOO>, _
      pattern: /<(?![<=])\S*?>|\b_\b/,
      alias: 'symbol',
    },
    'v-string': {
      // v1.2, 1.2.3
      pattern: /v\d+(?:\.\d+)*|\d+(?:\.\d+){2,}/,
      alias: 'string',
    },
    function: {
      pattern: /(\bsub[ \t]+)\w+/,
      lookbehind: true,
    },
    keyword:
      /\b(?:any|break|continue|default|delete|die|do|else|elsif|eval|for|foreach|given|goto|if|last|local|my|next|our|package|print|redo|require|return|say|state|sub|switch|undef|unless|until|use|when|while)\b/,
    number:
      /\b(?:0x[\dA-Fa-f](?:_?[\dA-Fa-f])*|0b[01](?:_?[01])*|(?:(?:\d(?:_?\d)*)?\.)?\d(?:_?\d)*(?:[Ee][+-]?\d+)?)\b/,
    operator:
      /-[rwxoRWXOezsfdlpSbctugkTBMAC]\b|\+[+=]?|-[-=>]?|\*\*?=?|\/\/?=?|=[=~>]?|~[~=]?|\|\|?=?|&&?=?|<(?:=>?|<=?)?|>>?=?|![~=]?|[%^]=?|\.(?:=|\.\.?)?|[\\?]|\bx(?:=|\b)|\b(?:and|cmp|eq|ge|gt|le|lt|ne|not|or|xor)\b/,
    punctuation: /[{}[\];(),:]/,
  };
})(Prism);

/**
 * Original by Aaron Harun: http://aahacreative.com/2012/07/31/php-syntax-highlighting-prism/
 * Modified by Miles Johnson: http://milesj.me
 * Rewritten by Tom Pavelec
 *
 * Supports PHP 5.3 - 8.0
 */
(function (Prism) {
  var comment = /\/\*[\s\S]*?\*\/|\/\/.*|#(?!\[).*/;
  var constant = [
    {
      pattern: /\b(?:false|true)\b/i,
      alias: 'boolean',
    },
    {
      pattern: /(::\s*)\b[a-z_]\w*\b(?!\s*\()/i,
      greedy: true,
      lookbehind: true,
    },
    {
      pattern: /(\b(?:case|const)\s+)\b[a-z_]\w*(?=\s*[;=])/i,
      greedy: true,
      lookbehind: true,
    },
    /\b(?:null)\b/i,
    /\b[A-Z_][A-Z0-9_]*\b(?!\s*\()/,
  ];
  var number =
    /\b0b[01]+(?:_[01]+)*\b|\b0o[0-7]+(?:_[0-7]+)*\b|\b0x[\da-f]+(?:_[\da-f]+)*\b|(?:\b\d+(?:_\d+)*\.?(?:\d+(?:_\d+)*)?|\B\.\d+)(?:e[+-]?\d+)?/i;
  var operator =
    /<?=>|\?\?=?|\.{3}|\??->|[!=]=?=?|::|\*\*=?|--|\+\+|&&|\|\||<<|>>|[?~]|[/^|%*&<>.+-]=?/;
  var punctuation = /[{}\[\](),:;]/;

  Prism.languages.php = {
    delimiter: {
      pattern: /\?>$|^<\?(?:php(?=\s)|=)?/i,
      alias: 'important',
    },
    comment: comment,
    variable: /\$+(?:\w+\b|(?=\{))/,
    package: {
      pattern: /(namespace\s+|use\s+(?:function\s+)?)(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
      lookbehind: true,
      inside: {
        punctuation: /\\/,
      },
    },
    'class-name-definition': {
      pattern: /(\b(?:class|enum|interface|trait)\s+)\b[a-z_]\w*(?!\\)\b/i,
      lookbehind: true,
      alias: 'class-name',
    },
    'function-definition': {
      pattern: /(\bfunction\s+)[a-z_]\w*(?=\s*\()/i,
      lookbehind: true,
      alias: 'function',
    },
    keyword: [
      {
        pattern: /(\(\s*)\b(?:array|bool|boolean|float|int|integer|object|string)\b(?=\s*\))/i,
        alias: 'type-casting',
        greedy: true,
        lookbehind: true,
      },
      {
        pattern:
          /([(,?]\s*)\b(?:array(?!\s*\()|bool|callable|(?:false|null)(?=\s*\|)|float|int|iterable|mixed|object|self|static|string)\b(?=\s*\$)/i,
        alias: 'type-hint',
        greedy: true,
        lookbehind: true,
      },
      {
        pattern:
          /(\)\s*:\s*(?:\?\s*)?)\b(?:array(?!\s*\()|bool|callable|(?:false|null)(?=\s*\|)|float|int|iterable|mixed|never|object|self|static|string|void)\b/i,
        alias: 'return-type',
        greedy: true,
        lookbehind: true,
      },
      {
        pattern: /\b(?:array(?!\s*\()|bool|float|int|iterable|mixed|object|string|void)\b/i,
        alias: 'type-declaration',
        greedy: true,
      },
      {
        pattern: /(\|\s*)(?:false|null)\b|\b(?:false|null)(?=\s*\|)/i,
        alias: 'type-declaration',
        greedy: true,
        lookbehind: true,
      },
      {
        pattern: /\b(?:parent|self|static)(?=\s*::)/i,
        alias: 'static-context',
        greedy: true,
      },
      {
        // yield from
        pattern: /(\byield\s+)from\b/i,
        lookbehind: true,
      },
      // `class` is always a keyword unlike other keywords
      /\bclass\b/i,
      {
        // https://www.php.net/manual/en/reserved.keywords.php
        //
        // keywords cannot be preceded by "->"
        // the complex lookbehind means `(?<!(?:->|::)\s*)`
        pattern:
          /((?:^|[^\s>:]|(?:^|[^-])>|(?:^|[^:]):)\s*)\b(?:abstract|and|array|as|break|callable|case|catch|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|enum|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|never|new|or|parent|print|private|protected|public|readonly|require|require_once|return|self|static|switch|throw|trait|try|unset|use|var|while|xor|yield|__halt_compiler)\b/i,
        lookbehind: true,
      },
    ],
    'argument-name': {
      pattern: /([(,]\s*)\b[a-z_]\w*(?=\s*:(?!:))/i,
      lookbehind: true,
    },
    'class-name': [
      {
        pattern:
          /(\b(?:extends|implements|instanceof|new(?!\s+self|\s+static))\s+|\bcatch\s*\()\b[a-z_]\w*(?!\\)\b/i,
        greedy: true,
        lookbehind: true,
      },
      {
        pattern: /(\|\s*)\b[a-z_]\w*(?!\\)\b/i,
        greedy: true,
        lookbehind: true,
      },
      {
        pattern: /\b[a-z_]\w*(?!\\)\b(?=\s*\|)/i,
        greedy: true,
      },
      {
        pattern: /(\|\s*)(?:\\?\b[a-z_]\w*)+\b/i,
        alias: 'class-name-fully-qualified',
        greedy: true,
        lookbehind: true,
        inside: {
          punctuation: /\\/,
        },
      },
      {
        pattern: /(?:\\?\b[a-z_]\w*)+\b(?=\s*\|)/i,
        alias: 'class-name-fully-qualified',
        greedy: true,
        inside: {
          punctuation: /\\/,
        },
      },
      {
        pattern:
          /(\b(?:extends|implements|instanceof|new(?!\s+self\b|\s+static\b))\s+|\bcatch\s*\()(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
        alias: 'class-name-fully-qualified',
        greedy: true,
        lookbehind: true,
        inside: {
          punctuation: /\\/,
        },
      },
      {
        pattern: /\b[a-z_]\w*(?=\s*\$)/i,
        alias: 'type-declaration',
        greedy: true,
      },
      {
        pattern: /(?:\\?\b[a-z_]\w*)+(?=\s*\$)/i,
        alias: ['class-name-fully-qualified', 'type-declaration'],
        greedy: true,
        inside: {
          punctuation: /\\/,
        },
      },
      {
        pattern: /\b[a-z_]\w*(?=\s*::)/i,
        alias: 'static-context',
        greedy: true,
      },
      {
        pattern: /(?:\\?\b[a-z_]\w*)+(?=\s*::)/i,
        alias: ['class-name-fully-qualified', 'static-context'],
        greedy: true,
        inside: {
          punctuation: /\\/,
        },
      },
      {
        pattern: /([(,?]\s*)[a-z_]\w*(?=\s*\$)/i,
        alias: 'type-hint',
        greedy: true,
        lookbehind: true,
      },
      {
        pattern: /([(,?]\s*)(?:\\?\b[a-z_]\w*)+(?=\s*\$)/i,
        alias: ['class-name-fully-qualified', 'type-hint'],
        greedy: true,
        lookbehind: true,
        inside: {
          punctuation: /\\/,
        },
      },
      {
        pattern: /(\)\s*:\s*(?:\?\s*)?)\b[a-z_]\w*(?!\\)\b/i,
        alias: 'return-type',
        greedy: true,
        lookbehind: true,
      },
      {
        pattern: /(\)\s*:\s*(?:\?\s*)?)(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
        alias: ['class-name-fully-qualified', 'return-type'],
        greedy: true,
        lookbehind: true,
        inside: {
          punctuation: /\\/,
        },
      },
    ],
    constant: constant,
    function: {
      pattern: /(^|[^\\\w])\\?[a-z_](?:[\w\\]*\w)?(?=\s*\()/i,
      lookbehind: true,
      inside: {
        punctuation: /\\/,
      },
    },
    property: {
      pattern: /(->\s*)\w+/,
      lookbehind: true,
    },
    number: number,
    operator: operator,
    punctuation: punctuation,
  };

  var string_interpolation = {
    pattern:
      /\{\$(?:\{(?:\{[^{}]+\}|[^{}]+)\}|[^{}])+\}|(^|[^\\{])\$+(?:\w+(?:\[[^\r\n\[\]]+\]|->\w+)?)/,
    lookbehind: true,
    inside: Prism.languages.php,
  };

  var string = [
    {
      pattern: /<<<'([^']+)'[\r\n](?:.*[\r\n])*?\1;/,
      alias: 'nowdoc-string',
      greedy: true,
      inside: {
        delimiter: {
          pattern: /^<<<'[^']+'|[a-z_]\w*;$/i,
          alias: 'symbol',
          inside: {
            punctuation: /^<<<'?|[';]$/,
          },
        },
      },
    },
    {
      pattern: /<<<(?:"([^"]+)"[\r\n](?:.*[\r\n])*?\1;|([a-z_]\w*)[\r\n](?:.*[\r\n])*?\2;)/i,
      alias: 'heredoc-string',
      greedy: true,
      inside: {
        delimiter: {
          pattern: /^<<<(?:"[^"]+"|[a-z_]\w*)|[a-z_]\w*;$/i,
          alias: 'symbol',
          inside: {
            punctuation: /^<<<"?|[";]$/,
          },
        },
        interpolation: string_interpolation,
      },
    },
    {
      pattern: /`(?:\\[\s\S]|[^\\`])*`/,
      alias: 'backtick-quoted-string',
      greedy: true,
    },
    {
      pattern: /'(?:\\[\s\S]|[^\\'])*'/,
      alias: 'single-quoted-string',
      greedy: true,
    },
    {
      pattern: /"(?:\\[\s\S]|[^\\"])*"/,
      alias: 'double-quoted-string',
      greedy: true,
      inside: {
        interpolation: string_interpolation,
      },
    },
  ];

  Prism.languages.insertBefore('php', 'variable', {
    string: string,
    attribute: {
      pattern:
        /#\[(?:[^"'\/#]|\/(?![*/])|\/\/.*$|#(?!\[).*$|\/\*(?:[^*]|\*(?!\/))*\*\/|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*')+\](?=\s*[a-z$#])/im,
      greedy: true,
      inside: {
        'attribute-content': {
          pattern: /^(#\[)[\s\S]+(?=\]$)/,
          lookbehind: true,
          // inside can appear subset of php
          inside: {
            comment: comment,
            string: string,
            'attribute-class-name': [
              {
                pattern: /([^:]|^)\b[a-z_]\w*(?!\\)\b/i,
                alias: 'class-name',
                greedy: true,
                lookbehind: true,
              },
              {
                pattern: /([^:]|^)(?:\\?\b[a-z_]\w*)+/i,
                alias: ['class-name', 'class-name-fully-qualified'],
                greedy: true,
                lookbehind: true,
                inside: {
                  punctuation: /\\/,
                },
              },
            ],
            constant: constant,
            number: number,
            operator: operator,
            punctuation: punctuation,
          },
        },
        delimiter: {
          pattern: /^#\[|\]$/,
          alias: 'punctuation',
        },
      },
    },
  });

  Prism.hooks.add('before-tokenize', function (env) {
    if (!/<\?/.test(env.code)) {
      return;
    }

    var phpPattern =
      /<\?(?:[^"'/#]|\/(?![*/])|("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|(?:\/\/|#(?!\[))(?:[^?\n\r]|\?(?!>))*(?=$|\?>|[\r\n])|#\[|\/\*(?:[^*]|\*(?!\/))*(?:\*\/|$))*?(?:\?>|$)/g;
    Prism.languages['markup-templating'].buildPlaceholders(env, 'php', phpPattern);
  });

  Prism.hooks.add('after-tokenize', function (env) {
    Prism.languages['markup-templating'].tokenizePlaceholders(env, 'php');
  });
})(Prism);

(function (Prism) {
  var powershell = (Prism.languages.powershell = {
    comment: [
      {
        pattern: /(^|[^`])<#[\s\S]*?#>/,
        lookbehind: true,
      },
      {
        pattern: /(^|[^`])#.*/,
        lookbehind: true,
      },
    ],
    string: [
      {
        pattern: /"(?:`[\s\S]|[^`"])*"/,
        greedy: true,
        inside: null, // see below
      },
      {
        pattern: /'(?:[^']|'')*'/,
        greedy: true,
      },
    ],
    // Matches name spaces as well as casts, attribute decorators. Force starting with letter to avoid matching array indices
    // Supports two levels of nested brackets (e.g. `[OutputType([System.Collections.Generic.List[int]])]`)
    namespace: /\[[a-z](?:\[(?:\[[^\]]*\]|[^\[\]])*\]|[^\[\]])*\]/i,
    boolean: /\$(?:false|true)\b/i,
    variable: /\$\w+\b/,
    // Cmdlets and aliases. Aliases should come last, otherwise "write" gets preferred over "write-host" for example
    // Get-Command | ?{ $_.ModuleName -match "Microsoft.PowerShell.(Util|Core|Management)" }
    // Get-Alias | ?{ $_.ReferencedCommand.Module.Name -match "Microsoft.PowerShell.(Util|Core|Management)" }
    function: [
      /\b(?:Add|Approve|Assert|Backup|Block|Checkpoint|Clear|Close|Compare|Complete|Compress|Confirm|Connect|Convert|ConvertFrom|ConvertTo|Copy|Debug|Deny|Disable|Disconnect|Dismount|Edit|Enable|Enter|Exit|Expand|Export|Find|ForEach|Format|Get|Grant|Group|Hide|Import|Initialize|Install|Invoke|Join|Limit|Lock|Measure|Merge|Move|New|Open|Optimize|Out|Ping|Pop|Protect|Publish|Push|Read|Receive|Redo|Register|Remove|Rename|Repair|Request|Reset|Resize|Resolve|Restart|Restore|Resume|Revoke|Save|Search|Select|Send|Set|Show|Skip|Sort|Split|Start|Step|Stop|Submit|Suspend|Switch|Sync|Tee|Test|Trace|Unblock|Undo|Uninstall|Unlock|Unprotect|Unpublish|Unregister|Update|Use|Wait|Watch|Where|Write)-[a-z]+\b/i,
      /\b(?:ac|cat|chdir|clc|cli|clp|clv|compare|copy|cp|cpi|cpp|cvpa|dbp|del|diff|dir|ebp|echo|epal|epcsv|epsn|erase|fc|fl|ft|fw|gal|gbp|gc|gci|gcs|gdr|gi|gl|gm|gp|gps|group|gsv|gu|gv|gwmi|iex|ii|ipal|ipcsv|ipsn|irm|iwmi|iwr|kill|lp|ls|measure|mi|mount|move|mp|mv|nal|ndr|ni|nv|ogv|popd|ps|pushd|pwd|rbp|rd|rdr|ren|ri|rm|rmdir|rni|rnp|rp|rv|rvpa|rwmi|sal|saps|sasv|sbp|sc|select|set|shcm|si|sl|sleep|sls|sort|sp|spps|spsv|start|sv|swmi|tee|trcm|type|write)\b/i,
    ],
    // per http://technet.microsoft.com/en-us/library/hh847744.aspx
    keyword:
      /\b(?:Begin|Break|Catch|Class|Continue|Data|Define|Do|DynamicParam|Else|ElseIf|End|Exit|Filter|Finally|For|ForEach|From|Function|If|InlineScript|Parallel|Param|Process|Return|Sequence|Switch|Throw|Trap|Try|Until|Using|Var|While|Workflow)\b/i,
    operator: {
      pattern:
        /(^|\W)(?:!|-(?:b?(?:and|x?or)|as|(?:Not)?(?:Contains|In|Like|Match)|eq|ge|gt|is(?:Not)?|Join|le|lt|ne|not|Replace|sh[lr])\b|-[-=]?|\+[+=]?|[*\/%]=?)/i,
      lookbehind: true,
    },
    punctuation: /[|{}[\];(),.]/,
  });

  // Variable interpolation inside strings, and nested expressions
  powershell.string[0].inside = {
    function: {
      // Allow for one level of nesting
      pattern: /(^|[^`])\$\((?:\$\([^\r\n()]*\)|(?!\$\()[^\r\n)])*\)/,
      lookbehind: true,
      inside: powershell,
    },
    boolean: powershell.boolean,
    variable: powershell.variable,
  };
})(Prism);

Prism.languages.python = {
  comment: {
    pattern: /(^|[^\\])#.*/,
    lookbehind: true,
    greedy: true,
  },
  'string-interpolation': {
    pattern: /(?:f|fr|rf)(?:("""|''')[\s\S]*?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2)/i,
    greedy: true,
    inside: {
      interpolation: {
        // "{" <expression> <optional "!s", "!r", or "!a"> <optional ":" format specifier> "}"
        pattern:
          /((?:^|[^{])(?:\{\{)*)\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}])+\})+\})+\}/,
        lookbehind: true,
        inside: {
          'format-spec': {
            pattern: /(:)[^:(){}]+(?=\}$)/,
            lookbehind: true,
          },
          'conversion-option': {
            pattern: /![sra](?=[:}]$)/,
            alias: 'punctuation',
          },
          rest: null,
        },
      },
      string: /[\s\S]+/,
    },
  },
  'triple-quoted-string': {
    pattern: /(?:[rub]|br|rb)?("""|''')[\s\S]*?\1/i,
    greedy: true,
    alias: 'string',
  },
  string: {
    pattern: /(?:[rub]|br|rb)?("|')(?:\\.|(?!\1)[^\\\r\n])*\1/i,
    greedy: true,
  },
  function: {
    pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,
    lookbehind: true,
  },
  'class-name': {
    pattern: /(\bclass\s+)\w+/i,
    lookbehind: true,
  },
  decorator: {
    pattern: /(^[\t ]*)@\w+(?:\.\w+)*/m,
    lookbehind: true,
    alias: ['annotation', 'punctuation'],
    inside: {
      punctuation: /\./,
    },
  },
  keyword:
    /\b(?:_(?=\s*:)|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/,
  builtin:
    /\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,
  boolean: /\b(?:False|None|True)\b/,
  number:
    /\b0(?:b(?:_?[01])+|o(?:_?[0-7])+|x(?:_?[a-f0-9])+)\b|(?:\b\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\B\.\d+(?:_\d+)*)(?:e[+-]?\d+(?:_\d+)*)?j?(?!\w)/i,
  operator: /[-+%=]=?|!=|:=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,
  punctuation: /[{}[\];(),.:]/,
};

Prism.languages.python['string-interpolation'].inside['interpolation'].inside.rest =
  Prism.languages.python;

Prism.languages.py = Prism.languages.python;

Prism.languages.r = {
  comment: /#.*/,
  string: {
    pattern: /(['"])(?:\\.|(?!\1)[^\\\r\n])*\1/,
    greedy: true,
  },
  'percent-operator': {
    // Includes user-defined operators
    // and %%, %*%, %/%, %in%, %o%, %x%
    pattern: /%[^%\s]*%/,
    alias: 'operator',
  },
  boolean: /\b(?:FALSE|TRUE)\b/,
  ellipsis: /\.\.(?:\.|\d+)/,
  number: [
    /\b(?:Inf|NaN)\b/,
    /(?:\b0x[\dA-Fa-f]+(?:\.\d*)?|\b\d+(?:\.\d*)?|\B\.\d+)(?:[EePp][+-]?\d+)?[iL]?/,
  ],
  keyword:
    /\b(?:NA|NA_character_|NA_complex_|NA_integer_|NA_real_|NULL|break|else|for|function|if|in|next|repeat|while)\b/,
  operator: /->?>?|<(?:=|<?-)?|[>=!]=?|::?|&&?|\|\|?|[+*\/^$@~]/,
  punctuation: /[(){}\[\],;]/,
};

(function (Prism) {
  var javascript = Prism.util.clone(Prism.languages.javascript);

  var space = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source;
  var braces = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source;
  var spread = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;

  /**
   * @param {string} source
   * @param {string} [flags]
   */
  function re(source, flags) {
    source = source
      .replace(/<S>/g, function () {
        return space;
      })
      .replace(/<BRACES>/g, function () {
        return braces;
      })
      .replace(/<SPREAD>/g, function () {
        return spread;
      });
    return RegExp(source, flags);
  }

  spread = re(spread).source;

  Prism.languages.jsx = Prism.languages.extend('markup', javascript);
  Prism.languages.jsx.tag.pattern = re(
    /<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/
      .source
  );

  Prism.languages.jsx.tag.inside['tag'].pattern = /^<\/?[^\s>\/]*/;
  Prism.languages.jsx.tag.inside['attr-value'].pattern =
    /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/;
  Prism.languages.jsx.tag.inside['tag'].inside['class-name'] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/;
  Prism.languages.jsx.tag.inside['comment'] = javascript['comment'];

  Prism.languages.insertBefore(
    'inside',
    'attr-name',
    {
      spread: {
        pattern: re(/<SPREAD>/.source),
        inside: Prism.languages.jsx,
      },
    },
    Prism.languages.jsx.tag
  );

  Prism.languages.insertBefore(
    'inside',
    'special-attr',
    {
      script: {
        // Allow for two levels of nesting
        pattern: re(/=<BRACES>/.source),
        alias: 'language-javascript',
        inside: {
          'script-punctuation': {
            pattern: /^=(?=\{)/,
            alias: 'punctuation',
          },
          rest: Prism.languages.jsx,
        },
      },
    },
    Prism.languages.jsx.tag
  );

  // The following will handle plain text inside tags
  var stringifyToken = function (token) {
    if (!token) {
      return '';
    }
    if (typeof token === 'string') {
      return token;
    }
    if (typeof token.content === 'string') {
      return token.content;
    }
    return token.content.map(stringifyToken).join('');
  };

  var walkTokens = function (tokens) {
    var openedTags = [];
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var notTagNorBrace = false;

      if (typeof token !== 'string') {
        if (token.type === 'tag' && token.content[0] && token.content[0].type === 'tag') {
          // We found a tag, now find its kind

          if (token.content[0].content[0].content === '</') {
            // Closing tag
            if (
              openedTags.length > 0 &&
              openedTags[openedTags.length - 1].tagName ===
                stringifyToken(token.content[0].content[1])
            ) {
              // Pop matching opening tag
              openedTags.pop();
            }
          } else {
            if (token.content[token.content.length - 1].content === '/>') {
              // Autoclosed tag, ignore
            } else {
              // Opening tag
              openedTags.push({
                tagName: stringifyToken(token.content[0].content[1]),
                openedBraces: 0,
              });
            }
          }
        } else if (openedTags.length > 0 && token.type === 'punctuation' && token.content === '{') {
          // Here we might have entered a JSX context inside a tag
          openedTags[openedTags.length - 1].openedBraces++;
        } else if (
          openedTags.length > 0 &&
          openedTags[openedTags.length - 1].openedBraces > 0 &&
          token.type === 'punctuation' &&
          token.content === '}'
        ) {
          // Here we might have left a JSX context inside a tag
          openedTags[openedTags.length - 1].openedBraces--;
        } else {
          notTagNorBrace = true;
        }
      }
      if (notTagNorBrace || typeof token === 'string') {
        if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces === 0) {
          // Here we are inside a tag, and not inside a JSX context.
          // That's plain text: drop any tokens matched.
          var plainText = stringifyToken(token);

          // And merge text with adjacent text
          if (
            i < tokens.length - 1 &&
            (typeof tokens[i + 1] === 'string' || tokens[i + 1].type === 'plain-text')
          ) {
            plainText += stringifyToken(tokens[i + 1]);
            tokens.splice(i + 1, 1);
          }
          if (i > 0 && (typeof tokens[i - 1] === 'string' || tokens[i - 1].type === 'plain-text')) {
            plainText = stringifyToken(tokens[i - 1]) + plainText;
            tokens.splice(i - 1, 1);
            i--;
          }

          tokens[i] = new Prism.Token('plain-text', plainText, null, plainText);
        }
      }

      if (token.content && typeof token.content !== 'string') {
        walkTokens(token.content);
      }
    }
  };

  Prism.hooks.add('after-tokenize', function (env) {
    if (env.language !== 'jsx' && env.language !== 'tsx') {
      return;
    }
    walkTokens(env.tokens);
  });
})(Prism);

(function (Prism) {
  Prism.languages.typescript = Prism.languages.extend('javascript', {
    'class-name': {
      pattern:
        /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
      lookbehind: true,
      greedy: true,
      inside: null, // see below
    },
    builtin:
      /\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/,
  });

  // The keywords TypeScript adds to JavaScript
  Prism.languages.typescript.keyword.push(
    /\b(?:abstract|declare|is|keyof|readonly|require)\b/,
    // keywords that have to be followed by an identifier
    /\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,
    // This is for `import type *, {}`
    /\btype\b(?=\s*(?:[\{*]|$))/
  );

  // doesn't work with TS because TS is too complex
  delete Prism.languages.typescript['parameter'];
  delete Prism.languages.typescript['literal-property'];

  // a version of typescript specifically for highlighting types
  var typeInside = Prism.languages.extend('typescript', {});
  delete typeInside['class-name'];

  Prism.languages.typescript['class-name'].inside = typeInside;

  Prism.languages.insertBefore('typescript', 'function', {
    decorator: {
      pattern: /@[$\w\xA0-\uFFFF]+/,
      inside: {
        at: {
          pattern: /^@/,
          alias: 'operator',
        },
        function: /^[\s\S]+/,
      },
    },
    'generic-function': {
      // e.g. foo<T extends "bar" | "baz">( ...
      pattern:
        /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,
      greedy: true,
      inside: {
        function: /^#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,
        generic: {
          pattern: /<[\s\S]+/, // everything after the first <
          alias: 'class-name',
          inside: typeInside,
        },
      },
    },
  });

  Prism.languages.ts = Prism.languages.typescript;
})(Prism);

(function (Prism) {
  var typescript = Prism.util.clone(Prism.languages.typescript);
  Prism.languages.tsx = Prism.languages.extend('jsx', typescript);

  // doesn't work with TS because TS is too complex
  delete Prism.languages.tsx['parameter'];
  delete Prism.languages.tsx['literal-property'];

  // This will prevent collisions between TSX tags and TS generic types.
  // Idea by https://github.com/karlhorky
  // Discussion: https://github.com/PrismJS/prism/issues/2594#issuecomment-710666928
  var tag = Prism.languages.tsx.tag;
  tag.pattern = RegExp(
    /(^|[^\w$]|(?=<\/))/.source + '(?:' + tag.pattern.source + ')',
    tag.pattern.flags
  );
  tag.lookbehind = true;
})(Prism);

/**
 * Original by Samuel Flores
 *
 * Adds the following new token classes:
 *     constant, builtin, variable, symbol, regex
 */
(function (Prism) {
  Prism.languages.ruby = Prism.languages.extend('clike', {
    comment: {
      pattern: /#.*|^=begin\s[\s\S]*?^=end/m,
      greedy: true,
    },
    'class-name': {
      pattern: /(\b(?:class|module)\s+|\bcatch\s+\()[\w.\\]+|\b[A-Z_]\w*(?=\s*\.\s*new\b)/,
      lookbehind: true,
      inside: {
        punctuation: /[.\\]/,
      },
    },
    keyword:
      /\b(?:BEGIN|END|alias|and|begin|break|case|class|def|define_method|defined|do|each|else|elsif|end|ensure|extend|for|if|in|include|module|new|next|nil|not|or|prepend|private|protected|public|raise|redo|require|rescue|retry|return|self|super|then|throw|undef|unless|until|when|while|yield)\b/,
    operator: /\.{2,3}|&\.|===|<?=>|[!=]?~|(?:&&|\|\||<<|>>|\*\*|[+\-*/%<>!^&|=])=?|[?:]/,
    punctuation: /[(){}[\].,;]/,
  });

  Prism.languages.insertBefore('ruby', 'operator', {
    'double-colon': {
      pattern: /::/,
      alias: 'punctuation',
    },
  });

  var interpolation = {
    pattern: /((?:^|[^\\])(?:\\{2})*)#\{(?:[^{}]|\{[^{}]*\})*\}/,
    lookbehind: true,
    inside: {
      content: {
        pattern: /^(#\{)[\s\S]+(?=\}$)/,
        lookbehind: true,
        inside: Prism.languages.ruby,
      },
      delimiter: {
        pattern: /^#\{|\}$/,
        alias: 'punctuation',
      },
    },
  };

  delete Prism.languages.ruby.function;

  var percentExpression =
    '(?:' +
    [
      /([^a-zA-Z0-9\s{(\[<=])(?:(?!\1)[^\\]|\\[\s\S])*\1/.source,
      /\((?:[^()\\]|\\[\s\S]|\((?:[^()\\]|\\[\s\S])*\))*\)/.source,
      /\{(?:[^{}\\]|\\[\s\S]|\{(?:[^{}\\]|\\[\s\S])*\})*\}/.source,
      /\[(?:[^\[\]\\]|\\[\s\S]|\[(?:[^\[\]\\]|\\[\s\S])*\])*\]/.source,
      /<(?:[^<>\\]|\\[\s\S]|<(?:[^<>\\]|\\[\s\S])*>)*>/.source,
    ].join('|') +
    ')';

  var symbolName = /(?:"(?:\\.|[^"\\\r\n])*"|(?:\b[a-zA-Z_]\w*|[^\s\0-\x7F]+)[?!]?|\$.)/.source;

  Prism.languages.insertBefore('ruby', 'keyword', {
    'regex-literal': [
      {
        pattern: RegExp(/%r/.source + percentExpression + /[egimnosux]{0,6}/.source),
        greedy: true,
        inside: {
          interpolation: interpolation,
          regex: /[\s\S]+/,
        },
      },
      {
        pattern:
          /(^|[^/])\/(?!\/)(?:\[[^\r\n\]]+\]|\\.|[^[/\\\r\n])+\/[egimnosux]{0,6}(?=\s*(?:$|[\r\n,.;})#]))/,
        lookbehind: true,
        greedy: true,
        inside: {
          interpolation: interpolation,
          regex: /[\s\S]+/,
        },
      },
    ],
    variable: /[@$]+[a-zA-Z_]\w*(?:[?!]|\b)/,
    symbol: [
      {
        pattern: RegExp(/(^|[^:]):/.source + symbolName),
        lookbehind: true,
        greedy: true,
      },
      {
        pattern: RegExp(/([\r\n{(,][ \t]*)/.source + symbolName + /(?=:(?!:))/.source),
        lookbehind: true,
        greedy: true,
      },
    ],
    'method-definition': {
      pattern: /(\bdef\s+)\w+(?:\s*\.\s*\w+)?/,
      lookbehind: true,
      inside: {
        function: /\b\w+$/,
        keyword: /^self\b/,
        'class-name': /^\w+/,
        punctuation: /\./,
      },
    },
  });

  Prism.languages.insertBefore('ruby', 'string', {
    'string-literal': [
      {
        pattern: RegExp(/%[qQiIwWs]?/.source + percentExpression),
        greedy: true,
        inside: {
          interpolation: interpolation,
          string: /[\s\S]+/,
        },
      },
      {
        pattern: /("|')(?:#\{[^}]+\}|#(?!\{)|\\(?:\r\n|[\s\S])|(?!\1)[^\\#\r\n])*\1/,
        greedy: true,
        inside: {
          interpolation: interpolation,
          string: /[\s\S]+/,
        },
      },
      {
        pattern: /<<[-~]?([a-z_]\w*)[\r\n](?:.*[\r\n])*?[\t ]*\1/i,
        alias: 'heredoc-string',
        greedy: true,
        inside: {
          delimiter: {
            pattern: /^<<[-~]?[a-z_]\w*|\b[a-z_]\w*$/i,
            inside: {
              symbol: /\b\w+/,
              punctuation: /^<<[-~]?/,
            },
          },
          interpolation: interpolation,
          string: /[\s\S]+/,
        },
      },
      {
        pattern: /<<[-~]?'([a-z_]\w*)'[\r\n](?:.*[\r\n])*?[\t ]*\1/i,
        alias: 'heredoc-string',
        greedy: true,
        inside: {
          delimiter: {
            pattern: /^<<[-~]?'[a-z_]\w*'|\b[a-z_]\w*$/i,
            inside: {
              symbol: /\b\w+/,
              punctuation: /^<<[-~]?'|'$/,
            },
          },
          string: /[\s\S]+/,
        },
      },
    ],
    'command-literal': [
      {
        pattern: RegExp(/%x/.source + percentExpression),
        greedy: true,
        inside: {
          interpolation: interpolation,
          command: {
            pattern: /[\s\S]+/,
            alias: 'string',
          },
        },
      },
      {
        pattern: /`(?:#\{[^}]+\}|#(?!\{)|\\(?:\r\n|[\s\S])|[^\\`#\r\n])*`/,
        greedy: true,
        inside: {
          interpolation: interpolation,
          command: {
            pattern: /[\s\S]+/,
            alias: 'string',
          },
        },
      },
    ],
  });

  delete Prism.languages.ruby.string;

  Prism.languages.insertBefore('ruby', 'number', {
    builtin:
      /\b(?:Array|Bignum|Binding|Class|Continuation|Dir|Exception|FalseClass|File|Fixnum|Float|Hash|IO|Integer|MatchData|Method|Module|NilClass|Numeric|Object|Proc|Range|Regexp|Stat|String|Struct|Symbol|TMS|Thread|ThreadGroup|Time|TrueClass)\b/,
    constant: /\b[A-Z][A-Z0-9_]*(?:[?!]|\b)/,
  });

  Prism.languages.rb = Prism.languages.ruby;
})(Prism);

(function (Prism) {
  var multilineComment = /\/\*(?:[^*/]|\*(?!\/)|\/(?!\*)|<self>)*\*\//.source;
  for (var i = 0; i < 2; i++) {
    // support 4 levels of nested comments
    multilineComment = multilineComment.replace(/<self>/g, function () {
      return multilineComment;
    });
  }
  multilineComment = multilineComment.replace(/<self>/g, function () {
    return /[^\s\S]/.source;
  });

  Prism.languages.rust = {
    comment: [
      {
        pattern: RegExp(/(^|[^\\])/.source + multilineComment),
        lookbehind: true,
        greedy: true,
      },
      {
        pattern: /(^|[^\\:])\/\/.*/,
        lookbehind: true,
        greedy: true,
      },
    ],
    string: {
      pattern: /b?"(?:\\[\s\S]|[^\\"])*"|b?r(#*)"(?:[^"]|"(?!\1))*"\1/,
      greedy: true,
    },
    char: {
      pattern: /b?'(?:\\(?:x[0-7][\da-fA-F]|u\{(?:[\da-fA-F]_*){1,6}\}|.)|[^\\\r\n\t'])'/,
      greedy: true,
    },
    attribute: {
      pattern: /#!?\[(?:[^\[\]"]|"(?:\\[\s\S]|[^\\"])*")*\]/,
      greedy: true,
      alias: 'attr-name',
      inside: {
        string: null, // see below
      },
    },

    // Closure params should not be confused with bitwise OR |
    'closure-params': {
      pattern: /([=(,:]\s*|\bmove\s*)\|[^|]*\||\|[^|]*\|(?=\s*(?:\{|->))/,
      lookbehind: true,
      greedy: true,
      inside: {
        'closure-punctuation': {
          pattern: /^\||\|$/,
          alias: 'punctuation',
        },
        rest: null, // see below
      },
    },

    'lifetime-annotation': {
      pattern: /'\w+/,
      alias: 'symbol',
    },

    'fragment-specifier': {
      pattern: /(\$\w+:)[a-z]+/,
      lookbehind: true,
      alias: 'punctuation',
    },
    variable: /\$\w+/,

    'function-definition': {
      pattern: /(\bfn\s+)\w+/,
      lookbehind: true,
      alias: 'function',
    },
    'type-definition': {
      pattern: /(\b(?:enum|struct|trait|type|union)\s+)\w+/,
      lookbehind: true,
      alias: 'class-name',
    },
    'module-declaration': [
      {
        pattern: /(\b(?:crate|mod)\s+)[a-z][a-z_\d]*/,
        lookbehind: true,
        alias: 'namespace',
      },
      {
        pattern:
          /(\b(?:crate|self|super)\s*)::\s*[a-z][a-z_\d]*\b(?:\s*::(?:\s*[a-z][a-z_\d]*\s*::)*)?/,
        lookbehind: true,
        alias: 'namespace',
        inside: {
          punctuation: /::/,
        },
      },
    ],
    keyword: [
      // https://github.com/rust-lang/reference/blob/master/src/keywords.md
      /\b(?:Self|abstract|as|async|await|become|box|break|const|continue|crate|do|dyn|else|enum|extern|final|fn|for|if|impl|in|let|loop|macro|match|mod|move|mut|override|priv|pub|ref|return|self|static|struct|super|trait|try|type|typeof|union|unsafe|unsized|use|virtual|where|while|yield)\b/,
      // primitives and str
      // https://doc.rust-lang.org/stable/rust-by-example/primitives.html
      /\b(?:bool|char|f(?:32|64)|[ui](?:8|16|32|64|128|size)|str)\b/,
    ],

    // functions can technically start with an upper-case letter, but this will introduce a lot of false positives
    // and Rust's naming conventions recommend snake_case anyway.
    // https://doc.rust-lang.org/1.0.0/style/style/naming/README.html
    function: /\b[a-z_]\w*(?=\s*(?:::\s*<|\())/,
    macro: {
      pattern: /\b\w+!/,
      alias: 'property',
    },
    constant: /\b[A-Z_][A-Z_\d]+\b/,
    'class-name': /\b[A-Z]\w*\b/,

    namespace: {
      pattern: /(?:\b[a-z][a-z_\d]*\s*::\s*)*\b[a-z][a-z_\d]*\s*::(?!\s*<)/,
      inside: {
        punctuation: /::/,
      },
    },

    // Hex, oct, bin, dec numbers with visual separators and type suffix
    number:
      /\b(?:0x[\dA-Fa-f](?:_?[\dA-Fa-f])*|0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*|(?:(?:\d(?:_?\d)*)?\.)?\d(?:_?\d)*(?:[Ee][+-]?\d+)?)(?:_?(?:f32|f64|[iu](?:8|16|32|64|size)?))?\b/,
    boolean: /\b(?:false|true)\b/,
    punctuation: /->|\.\.=|\.{1,3}|::|[{}[\];(),:]/,
    operator: /[-+*\/%!^]=?|=[=>]?|&[&=]?|\|[|=]?|<<?=?|>>?=?|[@?]/,
  };

  Prism.languages.rust['closure-params'].inside.rest = Prism.languages.rust;
  Prism.languages.rust['attribute'].inside['string'] = Prism.languages.rust['string'];
})(Prism);

(function (Prism) {
  var stringPattern = /(?:"(?:""|[^"])*"(?!")|'(?:''|[^'])*'(?!'))/.source;

  var number = /\b(?:\d[\da-f]*x|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/i;
  var numericConstant = {
    pattern: RegExp(stringPattern + '[bx]'),
    alias: 'number',
  };

  var macroVariable = {
    pattern: /&[a-z_]\w*/i,
  };

  var macroKeyword = {
    pattern:
      /((?:^|\s|=|\())%(?:ABORT|BY|CMS|COPY|DISPLAY|DO|ELSE|END|EVAL|GLOBAL|GO|GOTO|IF|INC|INCLUDE|INDEX|INPUT|KTRIM|LENGTH|LET|LIST|LOCAL|PUT|QKTRIM|QSCAN|QSUBSTR|QSYSFUNC|QUPCASE|RETURN|RUN|SCAN|SUBSTR|SUPERQ|SYMDEL|SYMEXIST|SYMGLOBL|SYMLOCAL|SYSCALL|SYSEVALF|SYSEXEC|SYSFUNC|SYSGET|SYSRPUT|THEN|TO|TSO|UNQUOTE|UNTIL|UPCASE|WHILE|WINDOW)\b/i,
    lookbehind: true,
    alias: 'keyword',
  };

  var step = {
    pattern: /(^|\s)(?:proc\s+\w+|data(?!=)|quit|run)\b/i,
    alias: 'keyword',
    lookbehind: true,
  };

  var comment = [
    /\/\*[\s\S]*?\*\//,
    {
      pattern: /(^[ \t]*|;\s*)\*[^;]*;/m,
      lookbehind: true,
    },
  ];

  var string = {
    pattern: RegExp(stringPattern),
    greedy: true,
  };

  var punctuation = /[$%@.(){}\[\];,\\]/;

  var func = {
    pattern: /%?\b\w+(?=\()/,
    alias: 'keyword',
  };

  var args = {
    function: func,
    'arg-value': {
      pattern: /(=\s*)[A-Z\.]+/i,
      lookbehind: true,
    },
    operator: /=/,
    'macro-variable': macroVariable,
    arg: {
      pattern: /[A-Z]+/i,
      alias: 'keyword',
    },
    number: number,
    'numeric-constant': numericConstant,
    punctuation: punctuation,
    string: string,
  };

  var format = {
    pattern: /\b(?:format|put)\b=?[\w'$.]+/i,
    inside: {
      keyword: /^(?:format|put)(?==)/i,
      equals: /=/,
      format: {
        pattern: /(?:\w|\$\d)+\.\d?/,
        alias: 'number',
      },
    },
  };

  var altformat = {
    pattern: /\b(?:format|put)\s+[\w']+(?:\s+[$.\w]+)+(?=;)/i,
    inside: {
      keyword: /^(?:format|put)/i,
      format: {
        pattern: /[\w$]+\.\d?/,
        alias: 'number',
      },
    },
  };

  var globalStatements = {
    pattern:
      /((?:^|\s)=?)(?:catname|checkpoint execute_always|dm|endsas|filename|footnote|%include|libname|%list|lock|missing|options|page|resetline|%run|sasfile|skip|sysecho|title\d?)\b/i,
    lookbehind: true,
    alias: 'keyword',
  };

  var submitStatement = {
    pattern: /(^|\s)(?:submit(?:\s+(?:load|norun|parseonly))?|endsubmit)\b/i,
    lookbehind: true,
    alias: 'keyword',
  };

  var actionSets =
    /aStore|accessControl|aggregation|audio|autotune|bayesianNetClassifier|bioMedImage|boolRule|builtins|cardinality|cdm|clustering|conditionalRandomFields|configuration|copula|countreg|dataDiscovery|dataPreprocess|dataSciencePilot|dataStep|decisionTree|deduplication|deepLearn|deepNeural|deepRnn|ds2|ecm|entityRes|espCluster|explainModel|factmac|fastKnn|fcmpact|fedSql|freqTab|gVarCluster|gam|gleam|graphSemiSupLearn|hiddenMarkovModel|hyperGroup|ica|image|iml|kernalPca|langModel|ldaTopic|loadStreams|mbc|mixed|mlTools|modelPublishing|network|neuralNet|nmf|nonParametricBayes|nonlinear|optNetwork|optimization|panel|pca|percentile|phreg|pls|qkb|qlim|quantreg|recommend|regression|reinforcementLearn|robustPca|ruleMining|sampling|sandwich|sccasl|search(?:Analytics)?|sentimentAnalysis|sequence|session(?:Prop)?|severity|simSystem|simple|smartData|sparkEmbeddedProcess|sparseML|spatialreg|spc|stabilityMonitoring|svDataDescription|svm|table|text(?:Filters|Frequency|Mining|Parse|Rule(?:Develop|Score)|Topic|Util)|timeData|transpose|tsInfo|tsReconcile|uniTimeSeries|varReduce/
      .source;

  var casActions = {
    pattern: RegExp(
      /(^|\s)(?:action\s+)?(?:<act>)\.[a-z]+\b[^;]+/.source.replace(/<act>/g, function () {
        return actionSets;
      }),
      'i'
    ),
    lookbehind: true,
    inside: {
      keyword: RegExp(
        /(?:<act>)\.[a-z]+\b/.source.replace(/<act>/g, function () {
          return actionSets;
        }),
        'i'
      ),
      action: {
        pattern: /(?:action)/i,
        alias: 'keyword',
      },
      comment: comment,
      function: func,
      'arg-value': args['arg-value'],
      operator: args.operator,
      argument: args.arg,
      number: number,
      'numeric-constant': numericConstant,
      punctuation: punctuation,
      string: string,
    },
  };

  var keywords = {
    pattern:
      /((?:^|\s)=?)(?:after|analysis|and|array|barchart|barwidth|begingraph|by|call|cas|cbarline|cfill|class(?:lev)?|close|column|computed?|contains|continue|data(?==)|define|delete|describe|document|do\s+over|do|dol|drop|dul|else|end(?:comp|source)?|entryTitle|eval(?:uate)?|exec(?:ute)?|exit|file(?:name)?|fill(?:attrs)?|flist|fnc|function(?:list)?|global|goto|group(?:by)?|headline|headskip|histogram|if|infile|keep|keylabel|keyword|label|layout|leave|legendlabel|length|libname|loadactionset|merge|midpoints|_?null_|name|noobs|nowd|ods|options|or|otherwise|out(?:put)?|over(?:lay)?|plot|print|put|raise|ranexp|rannor|rbreak|retain|return|select|session|sessref|set|source|statgraph|sum|summarize|table|temp|terminate|then\s+do|then|title\d?|to|var|when|where|xaxisopts|y2axisopts|yaxisopts)\b/i,
    lookbehind: true,
  };

  Prism.languages.sas = {
    datalines: {
      pattern: /^([ \t]*)(?:cards|(?:data)?lines);[\s\S]+?^[ \t]*;/im,
      lookbehind: true,
      alias: 'string',
      inside: {
        keyword: {
          pattern: /^(?:cards|(?:data)?lines)/i,
        },
        punctuation: /;/,
      },
    },

    'proc-sql': {
      pattern:
        /(^proc\s+(?:fed)?sql(?:\s+[\w|=]+)?;)[\s\S]+?(?=^(?:proc\s+\w+|data|quit|run);|(?![\s\S]))/im,
      lookbehind: true,
      inside: {
        sql: {
          pattern: RegExp(
            /^[ \t]*(?:select|alter\s+table|(?:create|describe|drop)\s+(?:index|table(?:\s+constraints)?|view)|create\s+unique\s+index|insert\s+into|update)(?:<str>|[^;"'])+;/.source.replace(
              /<str>/g,
              function () {
                return stringPattern;
              }
            ),
            'im'
          ),
          alias: 'language-sql',
          inside: Prism.languages.sql,
        },
        'global-statements': globalStatements,
        'sql-statements': {
          pattern:
            /(^|\s)(?:disconnect\s+from|begin|commit|exec(?:ute)?|reset|rollback|validate)\b/i,
          lookbehind: true,
          alias: 'keyword',
        },
        number: number,
        'numeric-constant': numericConstant,
        punctuation: punctuation,
        string: string,
      },
    },

    'proc-groovy': {
      pattern:
        /(^proc\s+groovy(?:\s+[\w|=]+)?;)[\s\S]+?(?=^(?:proc\s+\w+|data|quit|run);|(?![\s\S]))/im,
      lookbehind: true,
      inside: {
        comment: comment,
        groovy: {
          pattern: RegExp(
            /(^[ \t]*submit(?:\s+(?:load|norun|parseonly))?)(?:<str>|[^"'])+?(?=endsubmit;)/.source.replace(
              /<str>/g,
              function () {
                return stringPattern;
              }
            ),
            'im'
          ),
          lookbehind: true,
          alias: 'language-groovy',
          inside: Prism.languages.groovy,
        },
        keyword: keywords,
        'submit-statement': submitStatement,
        'global-statements': globalStatements,
        number: number,
        'numeric-constant': numericConstant,
        punctuation: punctuation,
        string: string,
      },
    },

    'proc-lua': {
      pattern:
        /(^proc\s+lua(?:\s+[\w|=]+)?;)[\s\S]+?(?=^(?:proc\s+\w+|data|quit|run);|(?![\s\S]))/im,
      lookbehind: true,
      inside: {
        comment: comment,
        lua: {
          pattern: RegExp(
            /(^[ \t]*submit(?:\s+(?:load|norun|parseonly))?)(?:<str>|[^"'])+?(?=endsubmit;)/.source.replace(
              /<str>/g,
              function () {
                return stringPattern;
              }
            ),
            'im'
          ),
          lookbehind: true,
          alias: 'language-lua',
          inside: Prism.languages.lua,
        },
        keyword: keywords,
        'submit-statement': submitStatement,
        'global-statements': globalStatements,
        number: number,
        'numeric-constant': numericConstant,
        punctuation: punctuation,
        string: string,
      },
    },

    'proc-cas': {
      pattern: /(^proc\s+cas(?:\s+[\w|=]+)?;)[\s\S]+?(?=^(?:proc\s+\w+|quit|data);|(?![\s\S]))/im,
      lookbehind: true,
      inside: {
        comment: comment,
        'statement-var': {
          pattern: /((?:^|\s)=?)saveresult\s[^;]+/im,
          lookbehind: true,
          inside: {
            statement: {
              pattern: /^saveresult\s+\S+/i,
              inside: {
                keyword: /^(?:saveresult)/i,
              },
            },
            rest: args,
          },
        },
        'cas-actions': casActions,
        statement: {
          pattern: /((?:^|\s)=?)(?:default|(?:un)?set|on|output|upload)[^;]+/im,
          lookbehind: true,
          inside: args,
        },
        step: step,
        keyword: keywords,
        function: func,
        format: format,
        altformat: altformat,
        'global-statements': globalStatements,
        number: number,
        'numeric-constant': numericConstant,
        punctuation: punctuation,
        string: string,
      },
    },

    'proc-args': {
      pattern: RegExp(
        /(^proc\s+\w+\s+)(?!\s)(?:[^;"']|<str>)+;/.source.replace(/<str>/g, function () {
          return stringPattern;
        }),
        'im'
      ),
      lookbehind: true,
      inside: args,
    },
    /*Special keywords within macros*/
    'macro-keyword': macroKeyword,
    'macro-variable': macroVariable,
    'macro-string-functions': {
      pattern: /((?:^|\s|=))%(?:BQUOTE|NRBQUOTE|NRQUOTE|NRSTR|QUOTE|STR)\(.*?(?:[^%]\))/i,
      lookbehind: true,
      inside: {
        function: {
          pattern: /%(?:BQUOTE|NRBQUOTE|NRQUOTE|NRSTR|QUOTE|STR)/i,
          alias: 'keyword',
        },
        'macro-keyword': macroKeyword,
        'macro-variable': macroVariable,
        'escaped-char': {
          pattern: /%['"()<>=¬^~;,#]/,
        },
        punctuation: punctuation,
      },
    },
    'macro-declaration': {
      pattern: /^%macro[^;]+(?=;)/im,
      inside: {
        keyword: /%macro/i,
      },
    },
    'macro-end': {
      pattern: /^%mend[^;]+(?=;)/im,
      inside: {
        keyword: /%mend/i,
      },
    },
    /*%_zscore(headcir, _lhc, _mhc, _shc, headcz, headcpct, _Fheadcz); */
    macro: {
      pattern: /%_\w+(?=\()/,
      alias: 'keyword',
    },
    input: {
      pattern: /\binput\s[-\w\s/*.$&]+;/i,
      inside: {
        input: {
          alias: 'keyword',
          pattern: /^input/i,
        },
        comment: comment,
        number: number,
        'numeric-constant': numericConstant,
      },
    },
    'options-args': {
      pattern: /(^options)[-'"|/\\<>*+=:()\w\s]*(?=;)/im,
      lookbehind: true,
      inside: args,
    },
    'cas-actions': casActions,
    comment: comment,
    function: func,
    format: format,
    altformat: altformat,
    'numeric-constant': numericConstant,
    datetime: {
      // '1jan2013'd, '9:25:19pm't, '18jan2003:9:27:05am'dt
      pattern: RegExp(stringPattern + '(?:dt?|t)'),
      alias: 'number',
    },
    string: string,
    step: step,
    keyword: keywords,
    // In SAS Studio syntax highlighting, these operators are styled like keywords
    'operator-keyword': {
      pattern: /\b(?:eq|ge|gt|in|le|lt|ne|not)\b/i,
      alias: 'operator',
    },
    // Decimal (1.2e23), hexadecimal (0c1x)
    number: number,
    operator: /\*\*?|\|\|?|!!?|¦¦?|<[>=]?|>[<=]?|[-+\/=&]|[~¬^]=?/,
    punctuation: punctuation,
  };
})(Prism);

Prism.languages.scala = Prism.languages.extend('java', {
  'triple-quoted-string': {
    pattern: /"""[\s\S]*?"""/,
    greedy: true,
    alias: 'string',
  },
  string: {
    pattern: /("|')(?:\\.|(?!\1)[^\\\r\n])*\1/,
    greedy: true,
  },
  keyword:
    /<-|=>|\b(?:abstract|case|catch|class|def|derives|do|else|enum|extends|extension|final|finally|for|forSome|given|if|implicit|import|infix|inline|lazy|match|new|null|object|opaque|open|override|package|private|protected|return|sealed|self|super|this|throw|trait|transparent|try|type|using|val|var|while|with|yield)\b/,
  number: /\b0x(?:[\da-f]*\.)?[\da-f]+|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e\d+)?[dfl]?/i,
  builtin:
    /\b(?:Any|AnyRef|AnyVal|Boolean|Byte|Char|Double|Float|Int|Long|Nothing|Short|String|Unit)\b/,
  symbol: /'[^\d\s\\]\w*/,
});

Prism.languages.insertBefore('scala', 'triple-quoted-string', {
  'string-interpolation': {
    pattern:
      /\b[a-z]\w*(?:"""(?:[^$]|\$(?:[^{]|\{(?:[^{}]|\{[^{}]*\})*\}))*?"""|"(?:[^$"\r\n]|\$(?:[^{]|\{(?:[^{}]|\{[^{}]*\})*\}))*")/i,
    greedy: true,
    inside: {
      id: {
        pattern: /^\w+/,
        greedy: true,
        alias: 'function',
      },
      escape: {
        pattern: /\\\$"|\$[$"]/,
        greedy: true,
        alias: 'symbol',
      },
      interpolation: {
        pattern: /\$(?:\w+|\{(?:[^{}]|\{[^{}]*\})*\})/,
        greedy: true,
        inside: {
          punctuation: /^\$\{?|\}$/,
          expression: {
            pattern: /[\s\S]+/,
            inside: Prism.languages.scala,
          },
        },
      },
      string: /[\s\S]+/,
    },
  },
});

delete Prism.languages.scala['class-name'];
delete Prism.languages.scala['function'];
delete Prism.languages.scala['constant'];

(function (Prism) {
  Prism.languages.scheme = {
    // this supports "normal" single-line comments:
    //   ; comment
    // and (potentially nested) multiline comments:
    //   #| comment #| nested |# still comment |#
    // (only 1 level of nesting is supported)
    comment:
      /;.*|#;\s*(?:\((?:[^()]|\([^()]*\))*\)|\[(?:[^\[\]]|\[[^\[\]]*\])*\])|#\|(?:[^#|]|#(?!\|)|\|(?!#)|#\|(?:[^#|]|#(?!\|)|\|(?!#))*\|#)*\|#/,
    string: {
      pattern: /"(?:[^"\\]|\\.)*"/,
      greedy: true,
    },
    symbol: {
      pattern: /'[^()\[\]#'\s]+/,
      greedy: true,
    },
    char: {
      pattern: /#\\(?:[ux][a-fA-F\d]+\b|[-a-zA-Z]+\b|[\uD800-\uDBFF][\uDC00-\uDFFF]|\S)/,
      greedy: true,
    },
    'lambda-parameter': [
      // https://www.cs.cmu.edu/Groups/AI/html/r4rs/r4rs_6.html#SEC30
      {
        pattern: /((?:^|[^'`#])[(\[]lambda\s+)(?:[^|()\[\]'\s]+|\|(?:[^\\|]|\\.)*\|)/,
        lookbehind: true,
      },
      {
        pattern: /((?:^|[^'`#])[(\[]lambda\s+[(\[])[^()\[\]']+/,
        lookbehind: true,
      },
    ],
    keyword: {
      pattern:
        /((?:^|[^'`#])[(\[])(?:begin|case(?:-lambda)?|cond(?:-expand)?|define(?:-library|-macro|-record-type|-syntax|-values)?|defmacro|delay(?:-force)?|do|else|except|export|guard|if|import|include(?:-ci|-library-declarations)?|lambda|let(?:rec)?(?:-syntax|-values|\*)?|let\*-values|only|parameterize|prefix|(?:quasi-?)?quote|rename|set!|syntax-(?:case|rules)|unless|unquote(?:-splicing)?|when)(?=[()\[\]\s]|$)/,
      lookbehind: true,
    },
    builtin: {
      // all functions of the base library of R7RS plus some of built-ins of R5Rs
      pattern:
        /((?:^|[^'`#])[(\[])(?:abs|and|append|apply|assoc|ass[qv]|binary-port\?|boolean=?\?|bytevector(?:-append|-copy|-copy!|-length|-u8-ref|-u8-set!|\?)?|caar|cadr|call-with-(?:current-continuation|port|values)|call\/cc|car|cdar|cddr|cdr|ceiling|char(?:->integer|-ready\?|\?|<\?|<=\?|=\?|>\?|>=\?)|close-(?:input-port|output-port|port)|complex\?|cons|current-(?:error|input|output)-port|denominator|dynamic-wind|eof-object\??|eq\?|equal\?|eqv\?|error|error-object(?:-irritants|-message|\?)|eval|even\?|exact(?:-integer-sqrt|-integer\?|\?)?|expt|features|file-error\?|floor(?:-quotient|-remainder|\/)?|flush-output-port|for-each|gcd|get-output-(?:bytevector|string)|inexact\??|input-port(?:-open\?|\?)|integer(?:->char|\?)|lcm|length|list(?:->string|->vector|-copy|-ref|-set!|-tail|\?)?|make-(?:bytevector|list|parameter|string|vector)|map|max|member|memq|memv|min|modulo|negative\?|newline|not|null\?|number(?:->string|\?)|numerator|odd\?|open-(?:input|output)-(?:bytevector|string)|or|output-port(?:-open\?|\?)|pair\?|peek-char|peek-u8|port\?|positive\?|procedure\?|quotient|raise|raise-continuable|rational\?|rationalize|read-(?:bytevector|bytevector!|char|error\?|line|string|u8)|real\?|remainder|reverse|round|set-c[ad]r!|square|string(?:->list|->number|->symbol|->utf8|->vector|-append|-copy|-copy!|-fill!|-for-each|-length|-map|-ref|-set!|\?|<\?|<=\?|=\?|>\?|>=\?)?|substring|symbol(?:->string|\?|=\?)|syntax-error|textual-port\?|truncate(?:-quotient|-remainder|\/)?|u8-ready\?|utf8->string|values|vector(?:->list|->string|-append|-copy|-copy!|-fill!|-for-each|-length|-map|-ref|-set!|\?)?|with-exception-handler|write-(?:bytevector|char|string|u8)|zero\?)(?=[()\[\]\s]|$)/,
      lookbehind: true,
    },
    operator: {
      pattern: /((?:^|[^'`#])[(\[])(?:[-+*%/]|[<>]=?|=>?)(?=[()\[\]\s]|$)/,
      lookbehind: true,
    },
    number: {
      // The number pattern from [the R7RS spec](https://small.r7rs.org/attachment/r7rs.pdf).
      //
      // <number>      := <num 2>|<num 8>|<num 10>|<num 16>
      // <num R>       := <prefix R><complex R>
      // <complex R>   := <real R>(?:@<real R>|<imaginary R>)?|<imaginary R>
      // <imaginary R> := [+-](?:<ureal R>|(?:inf|nan)\.0)?i
      // <real R>      := [+-]?<ureal R>|[+-](?:inf|nan)\.0
      // <ureal R>     := <uint R>(?:\/<uint R>)?
      //                | <decimal R>
      //
      // <decimal 10>  := (?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?
      // <uint R>      := <digit R>+
      // <prefix R>    := <radix R>(?:#[ei])?|(?:#[ei])?<radix R>
      // <radix 2>     := #b
      // <radix 8>     := #o
      // <radix 10>    := (?:#d)?
      // <radix 16>    := #x
      // <digit 2>     := [01]
      // <digit 8>     := [0-7]
      // <digit 10>    := \d
      // <digit 16>    := [0-9a-f]
      //
      // The problem with this grammar is that the resulting regex is way to complex, so we simplify by grouping all
      // non-decimal bases together. This results in a decimal (dec) and combined binary, octal, and hexadecimal (box)
      // pattern:
      pattern: RegExp(
        SortedBNF({
          '<ureal dec>': /\d+(?:\/\d+)|(?:\d+(?:\.\d*)?|\.\d+)(?:[esfdl][+-]?\d+)?/.source,
          '<real dec>': /[+-]?<ureal dec>|[+-](?:inf|nan)\.0/.source,
          '<imaginary dec>': /[+-](?:<ureal dec>|(?:inf|nan)\.0)?i/.source,
          '<complex dec>': /<real dec>(?:@<real dec>|<imaginary dec>)?|<imaginary dec>/.source,
          '<num dec>': /(?:#d(?:#[ei])?|#[ei](?:#d)?)?<complex dec>/.source,

          '<ureal box>': /[0-9a-f]+(?:\/[0-9a-f]+)?/.source,
          '<real box>': /[+-]?<ureal box>|[+-](?:inf|nan)\.0/.source,
          '<imaginary box>': /[+-](?:<ureal box>|(?:inf|nan)\.0)?i/.source,
          '<complex box>': /<real box>(?:@<real box>|<imaginary box>)?|<imaginary box>/.source,
          '<num box>': /#[box](?:#[ei])?|(?:#[ei])?#[box]<complex box>/.source,

          '<number>': /(^|[()\[\]\s])(?:<num dec>|<num box>)(?=[()\[\]\s]|$)/.source,
        }),
        'i'
      ),
      lookbehind: true,
    },
    boolean: {
      pattern: /(^|[()\[\]\s])#(?:[ft]|false|true)(?=[()\[\]\s]|$)/,
      lookbehind: true,
    },
    function: {
      pattern: /((?:^|[^'`#])[(\[])(?:[^|()\[\]'\s]+|\|(?:[^\\|]|\\.)*\|)(?=[()\[\]\s]|$)/,
      lookbehind: true,
    },
    identifier: {
      pattern: /(^|[()\[\]\s])\|(?:[^\\|]|\\.)*\|(?=[()\[\]\s]|$)/,
      lookbehind: true,
      greedy: true,
    },
    punctuation: /[()\[\]']/,
  };

  /**
   * Given a topologically sorted BNF grammar, this will return the RegExp source of last rule of the grammar.
   *
   * @param {Record<string, string>} grammar
   * @returns {string}
   */
  function SortedBNF(grammar) {
    for (var key in grammar) {
      grammar[key] = grammar[key].replace(/<[\w\s]+>/g, function (key) {
        return '(?:' + grammar[key].trim() + ')';
      });
    }
    // return the last item
    return grammar[key];
  }
})(Prism);

(function (Prism) {
  // CAREFUL!
  // The following patterns are concatenated, so the group referenced by a back reference is non-obvious!

  var strings = [
    // normal string
    /"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/.source,
    /'[^']*'/.source,
    /\$'(?:[^'\\]|\\[\s\S])*'/.source,

    // here doc
    // 2 capturing groups
    /<<-?\s*(["']?)(\w+)\1\s[\s\S]*?[\r\n]\2/.source,
  ].join('|');

  Prism.languages['shell-session'] = {
    command: {
      pattern: RegExp(
        // user info
        /^/.source +
          '(?:' +
          // <user> ":" ( <path> )?
          (/[^\s@:$#%*!/\\]+@[^\r\n@:$#%*!/\\]+(?::[^\0-\x1F$#%*?"<>:;|]+)?/.source +
            '|' +
            // <path>
            // Since the path pattern is quite general, we will require it to start with a special character to
            // prevent false positives.
            /[/~.][^\0-\x1F$#%*?"<>@:;|]*/.source) +
          ')?' +
          // shell symbol
          /[$#%](?=\s)/.source +
          // bash command
          /(?:[^\\\r\n \t'"<$]|[ \t](?:(?!#)|#.*$)|\\(?:[^\r]|\r\n?)|\$(?!')|<(?!<)|<<str>>)+/.source.replace(
            /<<str>>/g,
            function () {
              return strings;
            }
          ),
        'm'
      ),
      greedy: true,
      inside: {
        info: {
          // foo@bar:~/files$ exit
          // foo@bar$ exit
          // ~/files$ exit
          pattern: /^[^#$%]+/,
          alias: 'punctuation',
          inside: {
            user: /^[^\s@:$#%*!/\\]+@[^\r\n@:$#%*!/\\]+/,
            punctuation: /:/,
            path: /[\s\S]+/,
          },
        },
        bash: {
          pattern: /(^[$#%]\s*)\S[\s\S]*/,
          lookbehind: true,
          alias: 'language-bash',
          inside: Prism.languages.bash,
        },
        'shell-symbol': {
          pattern: /^[$#%]/,
          alias: 'important',
        },
      },
    },
    output: /.(?:.*(?:[\r\n]|.$))*/,
  };

  Prism.languages['sh-session'] = Prism.languages['shellsession'] =
    Prism.languages['shell-session'];
})(Prism);

Prism.languages.sql = {
  comment: {
    pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
    lookbehind: true,
  },
  variable: [
    {
      pattern: /@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
      greedy: true,
    },
    /@[\w.$]+/,
  ],
  string: {
    pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,
    greedy: true,
    lookbehind: true,
  },
  identifier: {
    pattern: /(^|[^@\\])`(?:\\[\s\S]|[^`\\]|``)*`/,
    greedy: true,
    lookbehind: true,
    inside: {
      punctuation: /^`|`$/,
    },
  },
  function:
    /\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i, // Should we highlight user defined functions too?
  keyword:
    /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:COL|_INSERT)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:ING|S)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,
  boolean: /\b(?:FALSE|NULL|TRUE)\b/i,
  number: /\b0x[\da-f]+\b|\b\d+(?:\.\d*)?|\B\.\d+\b/i,
  operator:
    /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
  punctuation: /[;[\]()`,.]/,
};

// https://www.stata.com/manuals/u.pdf
// https://www.stata.com/manuals/p.pdf

Prism.languages.stata = {
  comment: [
    {
      pattern: /(^[ \t]*)\*.*/m,
      lookbehind: true,
      greedy: true,
    },
    {
      pattern: /(^|\s)\/\/.*|\/\*[\s\S]*?\*\//,
      lookbehind: true,
      greedy: true,
    },
  ],
  'string-literal': {
    pattern: /"[^"\r\n]*"|[‘`']".*?"[’`']/,
    greedy: true,
    inside: {
      interpolation: {
        pattern: /\$\{[^{}]*\}|[‘`']\w[^’`'\r\n]*[’`']/,
        inside: {
          punctuation: /^\$\{|\}$/,
          expression: {
            pattern: /[\s\S]+/,
            inside: null, // see below
          },
        },
      },
      string: /[\s\S]+/,
    },
  },

  mata: {
    pattern: /(^[ \t]*mata[ \t]*:)[\s\S]+?(?=^end\b)/m,
    lookbehind: true,
    greedy: true,
    alias: 'language-mata',
    inside: Prism.languages.mata,
  },
  java: {
    pattern: /(^[ \t]*java[ \t]*:)[\s\S]+?(?=^end\b)/m,
    lookbehind: true,
    greedy: true,
    alias: 'language-java',
    inside: Prism.languages.java,
  },
  python: {
    pattern: /(^[ \t]*python[ \t]*:)[\s\S]+?(?=^end\b)/m,
    lookbehind: true,
    greedy: true,
    alias: 'language-python',
    inside: Prism.languages.python,
  },

  command: {
    pattern:
      /(^[ \t]*(?:\.[ \t]+)?(?:(?:bayes|bootstrap|by|bysort|capture|collect|fmm|fp|frame|jackknife|mfp|mi|nestreg|noisily|permute|quietly|rolling|simulate|statsby|stepwise|svy|version|xi)\b[^:\r\n]*:[ \t]*|(?:capture|noisily|quietly|version)[ \t]+)?)[a-zA-Z]\w*/m,
    lookbehind: true,
    greedy: true,
    alias: 'keyword',
  },
  variable: /\$\w+|[‘`']\w[^’`'\r\n]*[’`']/,
  keyword:
    /\b(?:bayes|bootstrap|by|bysort|capture|clear|collect|fmm|fp|frame|if|in|jackknife|mi[ \t]+estimate|mfp|nestreg|noisily|of|permute|quietly|rolling|simulate|sort|statsby|stepwise|svy|varlist|version|xi)\b/,

  boolean: /\b(?:off|on)\b/,
  number: /\b\d+(?:\.\d+)?\b|\B\.\d+/,
  function: /\b[a-z_]\w*(?=\()/i,

  operator: /\+\+|--|##?|[<>!=~]=?|[+\-*^&|/]/,
  punctuation: /[(){}[\],:]/,
};

Prism.languages.stata['string-literal'].inside.interpolation.inside.expression.inside =
  Prism.languages.stata;

Prism.languages.swift = {
  comment: {
    // Nested comments are supported up to 2 levels
    pattern: /(^|[^\\:])(?:\/\/.*|\/\*(?:[^/*]|\/(?!\*)|\*(?!\/)|\/\*(?:[^*]|\*(?!\/))*\*\/)*\*\/)/,
    lookbehind: true,
    greedy: true,
  },
  'string-literal': [
    // https://docs.swift.org/swift-book/LanguageGuide/StringsAndCharacters.html
    {
      pattern: RegExp(
        /(^|[^"#])/.source +
          '(?:' +
          // single-line string
          /"(?:\\(?:\((?:[^()]|\([^()]*\))*\)|\r\n|[^(])|[^\\\r\n"])*"/.source +
          '|' +
          // multi-line string
          /"""(?:\\(?:\((?:[^()]|\([^()]*\))*\)|[^(])|[^\\"]|"(?!""))*"""/.source +
          ')' +
          /(?!["#])/.source
      ),
      lookbehind: true,
      greedy: true,
      inside: {
        interpolation: {
          pattern: /(\\\()(?:[^()]|\([^()]*\))*(?=\))/,
          lookbehind: true,
          inside: null, // see below
        },
        'interpolation-punctuation': {
          pattern: /^\)|\\\($/,
          alias: 'punctuation',
        },
        punctuation: /\\(?=[\r\n])/,
        string: /[\s\S]+/,
      },
    },
    {
      pattern: RegExp(
        /(^|[^"#])(#+)/.source +
          '(?:' +
          // single-line string
          /"(?:\\(?:#+\((?:[^()]|\([^()]*\))*\)|\r\n|[^#])|[^\\\r\n])*?"/.source +
          '|' +
          // multi-line string
          /"""(?:\\(?:#+\((?:[^()]|\([^()]*\))*\)|[^#])|[^\\])*?"""/.source +
          ')' +
          '\\2'
      ),
      lookbehind: true,
      greedy: true,
      inside: {
        interpolation: {
          pattern: /(\\#+\()(?:[^()]|\([^()]*\))*(?=\))/,
          lookbehind: true,
          inside: null, // see below
        },
        'interpolation-punctuation': {
          pattern: /^\)|\\#+\($/,
          alias: 'punctuation',
        },
        string: /[\s\S]+/,
      },
    },
  ],

  directive: {
    // directives with conditions
    pattern: RegExp(
      /#/.source +
        '(?:' +
        (/(?:elseif|if)\b/.source +
          '(?:[ \t]*' +
          // This regex is a little complex. It's equivalent to this:
          //   (?:![ \t]*)?(?:\b\w+\b(?:[ \t]*<round>)?|<round>)(?:[ \t]*(?:&&|\|\|))?
          // where <round> is a general parentheses expression.
          /(?:![ \t]*)?(?:\b\w+\b(?:[ \t]*\((?:[^()]|\([^()]*\))*\))?|\((?:[^()]|\([^()]*\))*\))(?:[ \t]*(?:&&|\|\|))?/
            .source +
          ')+') +
        '|' +
        /(?:else|endif)\b/.source +
        ')'
    ),
    alias: 'property',
    inside: {
      'directive-name': /^#\w+/,
      boolean: /\b(?:false|true)\b/,
      number: /\b\d+(?:\.\d+)*\b/,
      operator: /!|&&|\|\||[<>]=?/,
      punctuation: /[(),]/,
    },
  },
  literal: {
    pattern:
      /#(?:colorLiteral|column|dsohandle|file(?:ID|Literal|Path)?|function|imageLiteral|line)\b/,
    alias: 'constant',
  },
  'other-directive': {
    pattern: /#\w+\b/,
    alias: 'property',
  },

  attribute: {
    pattern: /@\w+/,
    alias: 'atrule',
  },

  'function-definition': {
    pattern: /(\bfunc\s+)\w+/,
    lookbehind: true,
    alias: 'function',
  },
  label: {
    // https://docs.swift.org/swift-book/LanguageGuide/ControlFlow.html#ID141
    pattern: /\b(break|continue)\s+\w+|\b[a-zA-Z_]\w*(?=\s*:\s*(?:for|repeat|while)\b)/,
    lookbehind: true,
    alias: 'important',
  },

  keyword:
    /\b(?:Any|Protocol|Self|Type|actor|as|assignment|associatedtype|associativity|async|await|break|case|catch|class|continue|convenience|default|defer|deinit|didSet|do|dynamic|else|enum|extension|fallthrough|fileprivate|final|for|func|get|guard|higherThan|if|import|in|indirect|infix|init|inout|internal|is|isolated|lazy|left|let|lowerThan|mutating|none|nonisolated|nonmutating|open|operator|optional|override|postfix|precedencegroup|prefix|private|protocol|public|repeat|required|rethrows|return|right|safe|self|set|some|static|struct|subscript|super|switch|throw|throws|try|typealias|unowned|unsafe|var|weak|where|while|willSet)\b/,
  boolean: /\b(?:false|true)\b/,
  nil: {
    pattern: /\bnil\b/,
    alias: 'constant',
  },

  'short-argument': /\$\d+\b/,
  omit: {
    pattern: /\b_\b/,
    alias: 'keyword',
  },
  number: /\b(?:[\d_]+(?:\.[\de_]+)?|0x[a-f0-9_]+(?:\.[a-f0-9p_]+)?|0b[01_]+|0o[0-7_]+)\b/i,

  // A class name must start with an upper-case letter and be either 1 letter long or contain a lower-case letter.
  'class-name': /\b[A-Z](?:[A-Z_\d]*[a-z]\w*)?\b/,
  function: /\b[a-z_]\w*(?=\s*\()/i,
  constant: /\b(?:[A-Z_]{2,}|k[A-Z][A-Za-z_]+)\b/,

  // Operators are generic in Swift. Developers can even create new operators (e.g. +++).
  // https://docs.swift.org/swift-book/ReferenceManual/zzSummaryOfTheGrammar.html#ID481
  // This regex only supports ASCII operators.
  operator: /[-+*/%=!<>&|^~?]+|\.[.\-+*/%=!<>&|^~?]+/,
  punctuation: /[{}[\]();,.:\\]/,
};

Prism.languages.swift['string-literal'].forEach(function (rule) {
  rule.inside['interpolation'].inside = Prism.languages.swift;
});

Prism.languages.vbnet = Prism.languages.extend('basic', {
  comment: [
    {
      pattern: /(?:!|REM\b).+/i,
      inside: {
        keyword: /^REM/i,
      },
    },
    {
      pattern: /(^|[^\\:])'.*/,
      lookbehind: true,
      greedy: true,
    },
  ],
  string: {
    pattern: /(^|[^"])"(?:""|[^"])*"(?!")/,
    lookbehind: true,
    greedy: true,
  },
  keyword:
    /(?:\b(?:ADDHANDLER|ADDRESSOF|ALIAS|AND|ANDALSO|AS|BEEP|BLOAD|BOOLEAN|BSAVE|BYREF|BYTE|BYVAL|CALL(?: ABSOLUTE)?|CASE|CATCH|CBOOL|CBYTE|CCHAR|CDATE|CDBL|CDEC|CHAIN|CHAR|CHDIR|CINT|CLASS|CLEAR|CLNG|CLOSE|CLS|COBJ|COM|COMMON|CONST|CONTINUE|CSBYTE|CSHORT|CSNG|CSTR|CTYPE|CUINT|CULNG|CUSHORT|DATA|DATE|DECIMAL|DECLARE|DEF(?: FN| SEG|DBL|INT|LNG|SNG|STR)|DEFAULT|DELEGATE|DIM|DIRECTCAST|DO|DOUBLE|ELSE|ELSEIF|END|ENUM|ENVIRON|ERASE|ERROR|EVENT|EXIT|FALSE|FIELD|FILES|FINALLY|FOR(?: EACH)?|FRIEND|FUNCTION|GET|GETTYPE|GETXMLNAMESPACE|GLOBAL|GOSUB|GOTO|HANDLES|IF|IMPLEMENTS|IMPORTS|IN|INHERITS|INPUT|INTEGER|INTERFACE|IOCTL|IS|ISNOT|KEY|KILL|LET|LIB|LIKE|LINE INPUT|LOCATE|LOCK|LONG|LOOP|LSET|ME|MKDIR|MOD|MODULE|MUSTINHERIT|MUSTOVERRIDE|MYBASE|MYCLASS|NAME|NAMESPACE|NARROWING|NEW|NEXT|NOT|NOTHING|NOTINHERITABLE|NOTOVERRIDABLE|OBJECT|OF|OFF|ON(?: COM| ERROR| KEY| TIMER)?|OPEN|OPERATOR|OPTION(?: BASE)?|OPTIONAL|OR|ORELSE|OUT|OVERLOADS|OVERRIDABLE|OVERRIDES|PARAMARRAY|PARTIAL|POKE|PRIVATE|PROPERTY|PROTECTED|PUBLIC|PUT|RAISEEVENT|READ|READONLY|REDIM|REM|REMOVEHANDLER|RESTORE|RESUME|RETURN|RMDIR|RSET|RUN|SBYTE|SELECT(?: CASE)?|SET|SHADOWS|SHARED|SHELL|SHORT|SINGLE|SLEEP|STATIC|STEP|STOP|STRING|STRUCTURE|SUB|SWAP|SYNCLOCK|SYSTEM|THEN|THROW|TIMER|TO|TROFF|TRON|TRUE|TRY|TRYCAST|TYPE|TYPEOF|UINTEGER|ULONG|UNLOCK|UNTIL|USHORT|USING|VIEW PRINT|WAIT|WEND|WHEN|WHILE|WIDENING|WITH|WITHEVENTS|WRITE|WRITEONLY|XOR)|\B(?:#CONST|#ELSE|#ELSEIF|#END|#IF))(?:\$|\b)/i,
  punctuation: /[,;:(){}]/,
});

(function (Prism) {
  /**
   * If the given language is present, it will insert the given doc comment grammar token into it.
   *
   * @param {string} lang
   * @param {any} docComment
   */
  function insertDocComment(lang, docComment) {
    if (Prism.languages[lang]) {
      Prism.languages.insertBefore(lang, 'comment', {
        'doc-comment': docComment,
      });
    }
  }

  var tag = Prism.languages.markup.tag;

  var slashDocComment = {
    pattern: /\/\/\/.*/,
    greedy: true,
    alias: 'comment',
    inside: {
      tag: tag,
    },
  };
  var tickDocComment = {
    pattern: /'''.*/,
    greedy: true,
    alias: 'comment',
    inside: {
      tag: tag,
    },
  };

  insertDocComment('csharp', slashDocComment);
  insertDocComment('fsharp', slashDocComment);
  insertDocComment('vbnet', tickDocComment);
})(Prism);

(function (Prism) {
  // https://yaml.org/spec/1.2/spec.html#c-ns-anchor-property
  // https://yaml.org/spec/1.2/spec.html#c-ns-alias-node
  var anchorOrAlias = /[*&][^\s[\]{},]+/;
  // https://yaml.org/spec/1.2/spec.html#c-ns-tag-property
  var tag = /!(?:<[\w\-%#;/?:@&=+$,.!~*'()[\]]+>|(?:[a-zA-Z\d-]*!)?[\w\-%#;/?:@&=+$.~*'()]+)?/;
  // https://yaml.org/spec/1.2/spec.html#c-ns-properties(n,c)
  var properties =
    '(?:' +
    tag.source +
    '(?:[ \t]+' +
    anchorOrAlias.source +
    ')?|' +
    anchorOrAlias.source +
    '(?:[ \t]+' +
    tag.source +
    ')?)';
  // https://yaml.org/spec/1.2/spec.html#ns-plain(n,c)
  // This is a simplified version that doesn't support "#" and multiline keys
  // All these long scarry character classes are simplified versions of YAML's characters
  var plainKey =
    /(?:[^\s\x00-\x08\x0e-\x1f!"#%&'*,\-:>?@[\]`{|}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]|[?:-]<PLAIN>)(?:[ \t]*(?:(?![#:])<PLAIN>|:<PLAIN>))*/.source.replace(
      /<PLAIN>/g,
      function () {
        return /[^\s\x00-\x08\x0e-\x1f,[\]{}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]/.source;
      }
    );
  var string = /"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/.source;

  /**
   *
   * @param {string} value
   * @param {string} [flags]
   * @returns {RegExp}
   */
  function createValuePattern(value, flags) {
    flags = (flags || '').replace(/m/g, '') + 'm'; // add m flag
    var pattern =
      /([:\-,[{]\s*(?:\s<<prop>>[ \t]+)?)(?:<<value>>)(?=[ \t]*(?:$|,|\]|\}|(?:[\r\n]\s*)?#))/.source
        .replace(/<<prop>>/g, function () {
          return properties;
        })
        .replace(/<<value>>/g, function () {
          return value;
        });
    return RegExp(pattern, flags);
  }

  Prism.languages.yaml = {
    scalar: {
      pattern: RegExp(
        /([\-:]\s*(?:\s<<prop>>[ \t]+)?[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)\S[^\r\n]*(?:\2[^\r\n]+)*)/.source.replace(
          /<<prop>>/g,
          function () {
            return properties;
          }
        )
      ),
      lookbehind: true,
      alias: 'string',
    },
    comment: /#.*/,
    key: {
      pattern: RegExp(
        /((?:^|[:\-,[{\r\n?])[ \t]*(?:<<prop>>[ \t]+)?)<<key>>(?=\s*:\s)/.source
          .replace(/<<prop>>/g, function () {
            return properties;
          })
          .replace(/<<key>>/g, function () {
            return '(?:' + plainKey + '|' + string + ')';
          })
      ),
      lookbehind: true,
      greedy: true,
      alias: 'atrule',
    },
    directive: {
      pattern: /(^[ \t]*)%.+/m,
      lookbehind: true,
      alias: 'important',
    },
    datetime: {
      pattern: createValuePattern(
        /\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?(?:[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?))?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?/
          .source
      ),
      lookbehind: true,
      alias: 'number',
    },
    boolean: {
      pattern: createValuePattern(/false|true/.source, 'i'),
      lookbehind: true,
      alias: 'important',
    },
    null: {
      pattern: createValuePattern(/null|~/.source, 'i'),
      lookbehind: true,
      alias: 'important',
    },
    string: {
      pattern: createValuePattern(string),
      lookbehind: true,
      greedy: true,
    },
    number: {
      pattern: createValuePattern(
        /[+-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|\.inf|\.nan)/.source,
        'i'
      ),
      lookbehind: true,
    },
    tag: tag,
    important: anchorOrAlias,
    punctuation: /---|[:[\]{}\-,|>?]|\.\.\./,
  };

  Prism.languages.yml = Prism.languages.yaml;
})(Prism);
