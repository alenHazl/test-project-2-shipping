"use strict";
(() => {
  // bin/live-reload.js
  new EventSource(`${"http://localhost:3000"}/esbuild`).addEventListener("change", () => location.reload());

  // src/lib/combobox.js
  function wireComboboxKeyboard(opts) {
    const { input, list, getItems, onSelect, onOpen, isOpen, onClose } = opts;
    const listId = opts.listId || list.id || "";
    let highlightedIndex = -1;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "false");
    if (listId) input.setAttribute("aria-controls", listId);
    list.setAttribute("role", "listbox");
    const setHighlight = (index) => {
      const items = getItems();
      highlightedIndex = index;
      items.forEach((item, i) => {
        const active = i === index;
        item.setAttribute("aria-selected", active ? "true" : "false");
        if (active) {
          item.style.backgroundColor = "#e6f0ff";
          if (item.id) input.setAttribute("aria-activedescendant", item.id);
        } else {
          item.style.backgroundColor = "";
        }
      });
    };
    const clearHighlight = () => {
      const items = getItems();
      items.forEach((item) => {
        item.setAttribute("aria-selected", "false");
        item.style.backgroundColor = "";
      });
      highlightedIndex = -1;
      input.removeAttribute("aria-activedescendant");
    };
    const moveHighlight = (delta) => {
      const items = getItems();
      if (items.length === 0) return;
      const next = (highlightedIndex + delta + items.length) % items.length;
      setHighlight(next);
    };
    input.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen()) {
            onOpen();
            setTimeout(() => setHighlight(0), 0);
          } else {
            moveHighlight(1);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (isOpen()) {
            moveHighlight(-1);
          }
          break;
        case "Enter":
          if (isOpen()) {
            e.preventDefault();
            const items = getItems();
            const target = highlightedIndex >= 0 ? items[highlightedIndex] : items[0];
            if (target) onSelect(target);
          }
          break;
        case "Escape":
          if (isOpen()) {
            e.preventDefault();
            onClose();
            clearHighlight();
          }
          break;
        case "Home":
          if (isOpen()) {
            e.preventDefault();
            setHighlight(0);
          }
          break;
        case "End":
          if (isOpen()) {
            e.preventDefault();
            setHighlight(getItems().length - 1);
          }
          break;
        case "Tab":
          if (isOpen()) {
            onClose();
            clearHighlight();
          }
          break;
      }
    });
    return {
      setExpanded(expanded) {
        input.setAttribute("aria-expanded", expanded ? "true" : "false");
      },
      clearHighlight,
      setHighlight
    };
  }

  // src/lib/dropdown.js
  function createDropdown({ input, list, getItems, onSelect, onOpen }) {
    function show() {
      list.style.display = "block";
      list.classList.add("show");
      keyboard.setExpanded(true);
    }
    const keyboard = wireComboboxKeyboard({
      input,
      list,
      getItems,
      onSelect,
      onOpen: () => {
        if (onOpen?.() !== false) {
          show();
        }
      },
      isOpen: () => list.style.display === "block",
      onClose: hide
    });
    function hide() {
      list.style.display = "none";
      list.classList.remove("show");
      keyboard.setExpanded(false);
    }
    function toggle() {
      if (list.style.display === "none") {
        show();
      } else {
        hide();
      }
    }
    function bindOutsideClick(container) {
      document.addEventListener("click", (e) => {
        if (!container.contains(e.target)) {
          hide();
        }
      });
    }
    return { show, hide, toggle, bindOutsideClick, keyboard };
  }

  // src/features/cargo-dropdown.js
  function initCargoDropdown() {
    const fields = document.querySelectorAll("[data-cargo-field]");
    fields.forEach((field) => {
      const input = field.querySelector("[data-cargo-input]");
      const select = field.querySelector("[data-cargo-select]");
      const chevron = field.querySelector("[data-cargo-chevron]");
      const dropdownList = field.querySelector("[data-cargo-list]");
      const templateItem = dropdownList ? dropdownList.querySelector("[data-cargo-item]") : null;
      if (!input || !select || !dropdownList || !templateItem) return;
      const templateClone = templateItem.cloneNode(true);
      dropdownList.innerHTML = "";
      dropdownList.style.display = "none";
      select.selectedIndex = -1;
      select.dataset.isValid = "false";
      Array.from(select.options).forEach((option, index) => {
        const item = templateClone.cloneNode(true);
        const textEl = item.querySelector("[data-cargo-text]");
        const valueEl = item.querySelector("[data-cargo-value]");
        if (textEl) textEl.textContent = option.textContent;
        if (valueEl) valueEl.textContent = option.value;
        item.id = `${input.id || "cargo"}-option-${index}`;
        item.setAttribute("role", "option");
        item._select = () => {
          input.value = option.textContent;
          select.value = option.value;
          select.dataset.isValid = "true";
          select.dispatchEvent(new Event("change", { bubbles: true }));
          dropdown.hide();
        };
        item.addEventListener("click", (e) => {
          e.preventDefault();
          item._select();
        });
        dropdownList.appendChild(item);
      });
      const dropdown = createDropdown({
        input,
        list: dropdownList,
        getItems: () => Array.from(dropdownList.querySelectorAll("[data-cargo-item]")),
        onSelect: (item) => item._select && item._select()
      });
      input.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.toggle();
      });
      input.addEventListener("input", () => {
        select.dataset.isValid = "false";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      if (chevron) {
        chevron.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdown.toggle();
        });
      }
      dropdown.bindOutsideClick(field);
    });
  }

  // node_modules/.pnpm/flatpickr@4.6.13/node_modules/flatpickr/dist/esm/types/options.js
  var HOOKS = [
    "onChange",
    "onClose",
    "onDayCreate",
    "onDestroy",
    "onKeyDown",
    "onMonthChange",
    "onOpen",
    "onParseConfig",
    "onReady",
    "onValueUpdate",
    "onYearChange",
    "onPreCalendarPosition"
  ];
  var defaults = {
    _disable: [],
    allowInput: false,
    allowInvalidPreload: false,
    altFormat: "F j, Y",
    altInput: false,
    altInputClass: "form-control input",
    animate: typeof window === "object" && window.navigator.userAgent.indexOf("MSIE") === -1,
    ariaDateFormat: "F j, Y",
    autoFillDefaultTime: true,
    clickOpens: true,
    closeOnSelect: true,
    conjunction: ", ",
    dateFormat: "Y-m-d",
    defaultHour: 12,
    defaultMinute: 0,
    defaultSeconds: 0,
    disable: [],
    disableMobile: false,
    enableSeconds: false,
    enableTime: false,
    errorHandler: function(err) {
      return typeof console !== "undefined" && console.warn(err);
    },
    getWeek: function(givenDate) {
      var date = new Date(givenDate.getTime());
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      var week1 = new Date(date.getFullYear(), 0, 4);
      return 1 + Math.round(((date.getTime() - week1.getTime()) / 864e5 - 3 + (week1.getDay() + 6) % 7) / 7);
    },
    hourIncrement: 1,
    ignoredFocusElements: [],
    inline: false,
    locale: "default",
    minuteIncrement: 5,
    mode: "single",
    monthSelectorType: "dropdown",
    nextArrow: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 17 17'><g></g><path d='M13.207 8.472l-7.854 7.854-0.707-0.707 7.146-7.146-7.146-7.148 0.707-0.707 7.854 7.854z' /></svg>",
    noCalendar: false,
    now: /* @__PURE__ */ new Date(),
    onChange: [],
    onClose: [],
    onDayCreate: [],
    onDestroy: [],
    onKeyDown: [],
    onMonthChange: [],
    onOpen: [],
    onParseConfig: [],
    onReady: [],
    onValueUpdate: [],
    onYearChange: [],
    onPreCalendarPosition: [],
    plugins: [],
    position: "auto",
    positionElement: void 0,
    prevArrow: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 17 17'><g></g><path d='M5.207 8.471l7.146 7.147-0.707 0.707-7.853-7.854 7.854-7.853 0.707 0.707-7.147 7.146z' /></svg>",
    shorthandCurrentMonth: false,
    showMonths: 1,
    static: false,
    time_24hr: false,
    weekNumbers: false,
    wrap: false
  };

  // node_modules/.pnpm/flatpickr@4.6.13/node_modules/flatpickr/dist/esm/l10n/default.js
  var english = {
    weekdays: {
      shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      longhand: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ]
    },
    months: {
      shorthand: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      longhand: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ]
    },
    daysInMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    firstDayOfWeek: 0,
    ordinal: function(nth) {
      var s = nth % 100;
      if (s > 3 && s < 21)
        return "th";
      switch (s % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    },
    rangeSeparator: " to ",
    weekAbbreviation: "Wk",
    scrollTitle: "Scroll to increment",
    toggleTitle: "Click to toggle",
    amPM: ["AM", "PM"],
    yearAriaLabel: "Year",
    monthAriaLabel: "Month",
    hourAriaLabel: "Hour",
    minuteAriaLabel: "Minute",
    time_24hr: false
  };
  var default_default = english;

  // node_modules/.pnpm/flatpickr@4.6.13/node_modules/flatpickr/dist/esm/utils/index.js
  var pad = function(number, length) {
    if (length === void 0) {
      length = 2;
    }
    return ("000" + number).slice(length * -1);
  };
  var int = function(bool) {
    return bool === true ? 1 : 0;
  };
  function debounce(fn, wait) {
    var t;
    return function() {
      var _this = this;
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function() {
        return fn.apply(_this, args);
      }, wait);
    };
  }
  var arrayify = function(obj) {
    return obj instanceof Array ? obj : [obj];
  };

  // node_modules/.pnpm/flatpickr@4.6.13/node_modules/flatpickr/dist/esm/utils/dom.js
  function toggleClass(elem, className, bool) {
    if (bool === true)
      return elem.classList.add(className);
    elem.classList.remove(className);
  }
  function createElement(tag, className, content) {
    var e = window.document.createElement(tag);
    className = className || "";
    content = content || "";
    e.className = className;
    if (content !== void 0)
      e.textContent = content;
    return e;
  }
  function clearNode(node) {
    while (node.firstChild)
      node.removeChild(node.firstChild);
  }
  function findParent(node, condition) {
    if (condition(node))
      return node;
    else if (node.parentNode)
      return findParent(node.parentNode, condition);
    return void 0;
  }
  function createNumberInput(inputClassName, opts) {
    var wrapper = createElement("div", "numInputWrapper"), numInput = createElement("input", "numInput " + inputClassName), arrowUp = createElement("span", "arrowUp"), arrowDown = createElement("span", "arrowDown");
    if (navigator.userAgent.indexOf("MSIE 9.0") === -1) {
      numInput.type = "number";
    } else {
      numInput.type = "text";
      numInput.pattern = "\\d*";
    }
    if (opts !== void 0)
      for (var key in opts)
        numInput.setAttribute(key, opts[key]);
    wrapper.appendChild(numInput);
    wrapper.appendChild(arrowUp);
    wrapper.appendChild(arrowDown);
    return wrapper;
  }
  function getEventTarget(event) {
    try {
      if (typeof event.composedPath === "function") {
        var path = event.composedPath();
        return path[0];
      }
      return event.target;
    } catch (error) {
      return event.target;
    }
  }

  // node_modules/.pnpm/flatpickr@4.6.13/node_modules/flatpickr/dist/esm/utils/formatting.js
  var doNothing = function() {
    return void 0;
  };
  var monthToStr = function(monthNumber, shorthand, locale) {
    return locale.months[shorthand ? "shorthand" : "longhand"][monthNumber];
  };
  var revFormat = {
    D: doNothing,
    F: function(dateObj, monthName, locale) {
      dateObj.setMonth(locale.months.longhand.indexOf(monthName));
    },
    G: function(dateObj, hour) {
      dateObj.setHours((dateObj.getHours() >= 12 ? 12 : 0) + parseFloat(hour));
    },
    H: function(dateObj, hour) {
      dateObj.setHours(parseFloat(hour));
    },
    J: function(dateObj, day) {
      dateObj.setDate(parseFloat(day));
    },
    K: function(dateObj, amPM, locale) {
      dateObj.setHours(dateObj.getHours() % 12 + 12 * int(new RegExp(locale.amPM[1], "i").test(amPM)));
    },
    M: function(dateObj, shortMonth, locale) {
      dateObj.setMonth(locale.months.shorthand.indexOf(shortMonth));
    },
    S: function(dateObj, seconds) {
      dateObj.setSeconds(parseFloat(seconds));
    },
    U: function(_, unixSeconds) {
      return new Date(parseFloat(unixSeconds) * 1e3);
    },
    W: function(dateObj, weekNum, locale) {
      var weekNumber = parseInt(weekNum);
      var date = new Date(dateObj.getFullYear(), 0, 2 + (weekNumber - 1) * 7, 0, 0, 0, 0);
      date.setDate(date.getDate() - date.getDay() + locale.firstDayOfWeek);
      return date;
    },
    Y: function(dateObj, year) {
      dateObj.setFullYear(parseFloat(year));
    },
    Z: function(_, ISODate) {
      return new Date(ISODate);
    },
    d: function(dateObj, day) {
      dateObj.setDate(parseFloat(day));
    },
    h: function(dateObj, hour) {
      dateObj.setHours((dateObj.getHours() >= 12 ? 12 : 0) + parseFloat(hour));
    },
    i: function(dateObj, minutes) {
      dateObj.setMinutes(parseFloat(minutes));
    },
    j: function(dateObj, day) {
      dateObj.setDate(parseFloat(day));
    },
    l: doNothing,
    m: function(dateObj, month) {
      dateObj.setMonth(parseFloat(month) - 1);
    },
    n: function(dateObj, month) {
      dateObj.setMonth(parseFloat(month) - 1);
    },
    s: function(dateObj, seconds) {
      dateObj.setSeconds(parseFloat(seconds));
    },
    u: function(_, unixMillSeconds) {
      return new Date(parseFloat(unixMillSeconds));
    },
    w: doNothing,
    y: function(dateObj, year) {
      dateObj.setFullYear(2e3 + parseFloat(year));
    }
  };
  var tokenRegex = {
    D: "",
    F: "",
    G: "(\\d\\d|\\d)",
    H: "(\\d\\d|\\d)",
    J: "(\\d\\d|\\d)\\w+",
    K: "",
    M: "",
    S: "(\\d\\d|\\d)",
    U: "(.+)",
    W: "(\\d\\d|\\d)",
    Y: "(\\d{4})",
    Z: "(.+)",
    d: "(\\d\\d|\\d)",
    h: "(\\d\\d|\\d)",
    i: "(\\d\\d|\\d)",
    j: "(\\d\\d|\\d)",
    l: "",
    m: "(\\d\\d|\\d)",
    n: "(\\d\\d|\\d)",
    s: "(\\d\\d|\\d)",
    u: "(.+)",
    w: "(\\d\\d|\\d)",
    y: "(\\d{2})"
  };
  var formats = {
    Z: function(date) {
      return date.toISOString();
    },
    D: function(date, locale, options) {
      return locale.weekdays.shorthand[formats.w(date, locale, options)];
    },
    F: function(date, locale, options) {
      return monthToStr(formats.n(date, locale, options) - 1, false, locale);
    },
    G: function(date, locale, options) {
      return pad(formats.h(date, locale, options));
    },
    H: function(date) {
      return pad(date.getHours());
    },
    J: function(date, locale) {
      return locale.ordinal !== void 0 ? date.getDate() + locale.ordinal(date.getDate()) : date.getDate();
    },
    K: function(date, locale) {
      return locale.amPM[int(date.getHours() > 11)];
    },
    M: function(date, locale) {
      return monthToStr(date.getMonth(), true, locale);
    },
    S: function(date) {
      return pad(date.getSeconds());
    },
    U: function(date) {
      return date.getTime() / 1e3;
    },
    W: function(date, _, options) {
      return options.getWeek(date);
    },
    Y: function(date) {
      return pad(date.getFullYear(), 4);
    },
    d: function(date) {
      return pad(date.getDate());
    },
    h: function(date) {
      return date.getHours() % 12 ? date.getHours() % 12 : 12;
    },
    i: function(date) {
      return pad(date.getMinutes());
    },
    j: function(date) {
      return date.getDate();
    },
    l: function(date, locale) {
      return locale.weekdays.longhand[date.getDay()];
    },
    m: function(date) {
      return pad(date.getMonth() + 1);
    },
    n: function(date) {
      return date.getMonth() + 1;
    },
    s: function(date) {
      return date.getSeconds();
    },
    u: function(date) {
      return date.getTime();
    },
    w: function(date) {
      return date.getDay();
    },
    y: function(date) {
      return String(date.getFullYear()).substring(2);
    }
  };

  // node_modules/.pnpm/flatpickr@4.6.13/node_modules/flatpickr/dist/esm/utils/dates.js
  var createDateFormatter = function(_a) {
    var _b = _a.config, config = _b === void 0 ? defaults : _b, _c = _a.l10n, l10n = _c === void 0 ? english : _c, _d = _a.isMobile, isMobile = _d === void 0 ? false : _d;
    return function(dateObj, frmt, overrideLocale) {
      var locale = overrideLocale || l10n;
      if (config.formatDate !== void 0 && !isMobile) {
        return config.formatDate(dateObj, frmt, locale);
      }
      return frmt.split("").map(function(c, i, arr) {
        return formats[c] && arr[i - 1] !== "\\" ? formats[c](dateObj, locale, config) : c !== "\\" ? c : "";
      }).join("");
    };
  };
  var createDateParser = function(_a) {
    var _b = _a.config, config = _b === void 0 ? defaults : _b, _c = _a.l10n, l10n = _c === void 0 ? english : _c;
    return function(date, givenFormat, timeless, customLocale) {
      if (date !== 0 && !date)
        return void 0;
      var locale = customLocale || l10n;
      var parsedDate;
      var dateOrig = date;
      if (date instanceof Date)
        parsedDate = new Date(date.getTime());
      else if (typeof date !== "string" && date.toFixed !== void 0)
        parsedDate = new Date(date);
      else if (typeof date === "string") {
        var format = givenFormat || (config || defaults).dateFormat;
        var datestr = String(date).trim();
        if (datestr === "today") {
          parsedDate = /* @__PURE__ */ new Date();
          timeless = true;
        } else if (config && config.parseDate) {
          parsedDate = config.parseDate(date, format);
        } else if (/Z$/.test(datestr) || /GMT$/.test(datestr)) {
          parsedDate = new Date(date);
        } else {
          var matched = void 0, ops = [];
          for (var i = 0, matchIndex = 0, regexStr = ""; i < format.length; i++) {
            var token = format[i];
            var isBackSlash = token === "\\";
            var escaped = format[i - 1] === "\\" || isBackSlash;
            if (tokenRegex[token] && !escaped) {
              regexStr += tokenRegex[token];
              var match = new RegExp(regexStr).exec(date);
              if (match && (matched = true)) {
                ops[token !== "Y" ? "push" : "unshift"]({
                  fn: revFormat[token],
                  val: match[++matchIndex]
                });
              }
            } else if (!isBackSlash)
              regexStr += ".";
          }
          parsedDate = !config || !config.noCalendar ? new Date((/* @__PURE__ */ new Date()).getFullYear(), 0, 1, 0, 0, 0, 0) : new Date((/* @__PURE__ */ new Date()).setHours(0, 0, 0, 0));
          ops.forEach(function(_a2) {
            var fn = _a2.fn, val = _a2.val;
            return parsedDate = fn(parsedDate, val, locale) || parsedDate;
          });
          parsedDate = matched ? parsedDate : void 0;
        }
      }
      if (!(parsedDate instanceof Date && !isNaN(parsedDate.getTime()))) {
        config.errorHandler(new Error("Invalid date provided: " + dateOrig));
        return void 0;
      }
      if (timeless === true)
        parsedDate.setHours(0, 0, 0, 0);
      return parsedDate;
    };
  };
  function compareDates(date1, date2, timeless) {
    if (timeless === void 0) {
      timeless = true;
    }
    if (timeless !== false) {
      return new Date(date1.getTime()).setHours(0, 0, 0, 0) - new Date(date2.getTime()).setHours(0, 0, 0, 0);
    }
    return date1.getTime() - date2.getTime();
  }
  var isBetween = function(ts, ts1, ts2) {
    return ts > Math.min(ts1, ts2) && ts < Math.max(ts1, ts2);
  };
  var calculateSecondsSinceMidnight = function(hours, minutes, seconds) {
    return hours * 3600 + minutes * 60 + seconds;
  };
  var parseSeconds = function(secondsSinceMidnight) {
    var hours = Math.floor(secondsSinceMidnight / 3600), minutes = (secondsSinceMidnight - hours * 3600) / 60;
    return [hours, minutes, secondsSinceMidnight - hours * 3600 - minutes * 60];
  };
  var duration = {
    DAY: 864e5
  };
  function getDefaultHours(config) {
    var hours = config.defaultHour;
    var minutes = config.defaultMinute;
    var seconds = config.defaultSeconds;
    if (config.minDate !== void 0) {
      var minHour = config.minDate.getHours();
      var minMinutes = config.minDate.getMinutes();
      var minSeconds = config.minDate.getSeconds();
      if (hours < minHour) {
        hours = minHour;
      }
      if (hours === minHour && minutes < minMinutes) {
        minutes = minMinutes;
      }
      if (hours === minHour && minutes === minMinutes && seconds < minSeconds)
        seconds = config.minDate.getSeconds();
    }
    if (config.maxDate !== void 0) {
      var maxHr = config.maxDate.getHours();
      var maxMinutes = config.maxDate.getMinutes();
      hours = Math.min(hours, maxHr);
      if (hours === maxHr)
        minutes = Math.min(maxMinutes, minutes);
      if (hours === maxHr && minutes === maxMinutes)
        seconds = config.maxDate.getSeconds();
    }
    return { hours, minutes, seconds };
  }

  // node_modules/.pnpm/flatpickr@4.6.13/node_modules/flatpickr/dist/esm/utils/polyfills.js
  if (typeof Object.assign !== "function") {
    Object.assign = function(target) {
      var args = [];
      for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
      }
      if (!target) {
        throw TypeError("Cannot convert undefined or null to object");
      }
      var _loop_1 = function(source2) {
        if (source2) {
          Object.keys(source2).forEach(function(key) {
            return target[key] = source2[key];
          });
        }
      };
      for (var _a = 0, args_1 = args; _a < args_1.length; _a++) {
        var source = args_1[_a];
        _loop_1(source);
      }
      return target;
    };
  }

  // node_modules/.pnpm/flatpickr@4.6.13/node_modules/flatpickr/dist/esm/index.js
  var __assign = function() {
    __assign = Object.assign || function(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
      }
      return t;
    };
    return __assign.apply(this, arguments);
  };
  var __spreadArrays = function() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
        r[k] = a[j];
    return r;
  };
  var DEBOUNCED_CHANGE_MS = 300;
  function FlatpickrInstance(element, instanceConfig) {
    var self = {
      config: __assign(__assign({}, defaults), flatpickr.defaultConfig),
      l10n: default_default
    };
    self.parseDate = createDateParser({ config: self.config, l10n: self.l10n });
    self._handlers = [];
    self.pluginElements = [];
    self.loadedPlugins = [];
    self._bind = bind;
    self._setHoursFromDate = setHoursFromDate;
    self._positionCalendar = positionCalendar;
    self.changeMonth = changeMonth;
    self.changeYear = changeYear;
    self.clear = clear;
    self.close = close;
    self.onMouseOver = onMouseOver;
    self._createElement = createElement;
    self.createDay = createDay;
    self.destroy = destroy;
    self.isEnabled = isEnabled;
    self.jumpToDate = jumpToDate;
    self.updateValue = updateValue;
    self.open = open;
    self.redraw = redraw;
    self.set = set;
    self.setDate = setDate;
    self.toggle = toggle;
    function setupHelperFunctions() {
      self.utils = {
        getDaysInMonth: function(month, yr) {
          if (month === void 0) {
            month = self.currentMonth;
          }
          if (yr === void 0) {
            yr = self.currentYear;
          }
          if (month === 1 && (yr % 4 === 0 && yr % 100 !== 0 || yr % 400 === 0))
            return 29;
          return self.l10n.daysInMonth[month];
        }
      };
    }
    function init() {
      self.element = self.input = element;
      self.isOpen = false;
      parseConfig();
      setupLocale();
      setupInputs();
      setupDates();
      setupHelperFunctions();
      if (!self.isMobile)
        build();
      bindEvents();
      if (self.selectedDates.length || self.config.noCalendar) {
        if (self.config.enableTime) {
          setHoursFromDate(self.config.noCalendar ? self.latestSelectedDateObj : void 0);
        }
        updateValue(false);
      }
      setCalendarWidth();
      var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (!self.isMobile && isSafari) {
        positionCalendar();
      }
      triggerEvent("onReady");
    }
    function getClosestActiveElement() {
      var _a;
      return ((_a = self.calendarContainer) === null || _a === void 0 ? void 0 : _a.getRootNode()).activeElement || document.activeElement;
    }
    function bindToInstance(fn) {
      return fn.bind(self);
    }
    function setCalendarWidth() {
      var config = self.config;
      if (config.weekNumbers === false && config.showMonths === 1) {
        return;
      } else if (config.noCalendar !== true) {
        window.requestAnimationFrame(function() {
          if (self.calendarContainer !== void 0) {
            self.calendarContainer.style.visibility = "hidden";
            self.calendarContainer.style.display = "block";
          }
          if (self.daysContainer !== void 0) {
            var daysWidth = (self.days.offsetWidth + 1) * config.showMonths;
            self.daysContainer.style.width = daysWidth + "px";
            self.calendarContainer.style.width = daysWidth + (self.weekWrapper !== void 0 ? self.weekWrapper.offsetWidth : 0) + "px";
            self.calendarContainer.style.removeProperty("visibility");
            self.calendarContainer.style.removeProperty("display");
          }
        });
      }
    }
    function updateTime(e) {
      if (self.selectedDates.length === 0) {
        var defaultDate = self.config.minDate === void 0 || compareDates(/* @__PURE__ */ new Date(), self.config.minDate) >= 0 ? /* @__PURE__ */ new Date() : new Date(self.config.minDate.getTime());
        var defaults2 = getDefaultHours(self.config);
        defaultDate.setHours(defaults2.hours, defaults2.minutes, defaults2.seconds, defaultDate.getMilliseconds());
        self.selectedDates = [defaultDate];
        self.latestSelectedDateObj = defaultDate;
      }
      if (e !== void 0 && e.type !== "blur") {
        timeWrapper(e);
      }
      var prevValue = self._input.value;
      setHoursFromInputs();
      updateValue();
      if (self._input.value !== prevValue) {
        self._debouncedChange();
      }
    }
    function ampm2military(hour, amPM) {
      return hour % 12 + 12 * int(amPM === self.l10n.amPM[1]);
    }
    function military2ampm(hour) {
      switch (hour % 24) {
        case 0:
        case 12:
          return 12;
        default:
          return hour % 12;
      }
    }
    function setHoursFromInputs() {
      if (self.hourElement === void 0 || self.minuteElement === void 0)
        return;
      var hours = (parseInt(self.hourElement.value.slice(-2), 10) || 0) % 24, minutes = (parseInt(self.minuteElement.value, 10) || 0) % 60, seconds = self.secondElement !== void 0 ? (parseInt(self.secondElement.value, 10) || 0) % 60 : 0;
      if (self.amPM !== void 0) {
        hours = ampm2military(hours, self.amPM.textContent);
      }
      var limitMinHours = self.config.minTime !== void 0 || self.config.minDate && self.minDateHasTime && self.latestSelectedDateObj && compareDates(self.latestSelectedDateObj, self.config.minDate, true) === 0;
      var limitMaxHours = self.config.maxTime !== void 0 || self.config.maxDate && self.maxDateHasTime && self.latestSelectedDateObj && compareDates(self.latestSelectedDateObj, self.config.maxDate, true) === 0;
      if (self.config.maxTime !== void 0 && self.config.minTime !== void 0 && self.config.minTime > self.config.maxTime) {
        var minBound = calculateSecondsSinceMidnight(self.config.minTime.getHours(), self.config.minTime.getMinutes(), self.config.minTime.getSeconds());
        var maxBound = calculateSecondsSinceMidnight(self.config.maxTime.getHours(), self.config.maxTime.getMinutes(), self.config.maxTime.getSeconds());
        var currentTime = calculateSecondsSinceMidnight(hours, minutes, seconds);
        if (currentTime > maxBound && currentTime < minBound) {
          var result = parseSeconds(minBound);
          hours = result[0];
          minutes = result[1];
          seconds = result[2];
        }
      } else {
        if (limitMaxHours) {
          var maxTime = self.config.maxTime !== void 0 ? self.config.maxTime : self.config.maxDate;
          hours = Math.min(hours, maxTime.getHours());
          if (hours === maxTime.getHours())
            minutes = Math.min(minutes, maxTime.getMinutes());
          if (minutes === maxTime.getMinutes())
            seconds = Math.min(seconds, maxTime.getSeconds());
        }
        if (limitMinHours) {
          var minTime = self.config.minTime !== void 0 ? self.config.minTime : self.config.minDate;
          hours = Math.max(hours, minTime.getHours());
          if (hours === minTime.getHours() && minutes < minTime.getMinutes())
            minutes = minTime.getMinutes();
          if (minutes === minTime.getMinutes())
            seconds = Math.max(seconds, minTime.getSeconds());
        }
      }
      setHours(hours, minutes, seconds);
    }
    function setHoursFromDate(dateObj) {
      var date = dateObj || self.latestSelectedDateObj;
      if (date && date instanceof Date) {
        setHours(date.getHours(), date.getMinutes(), date.getSeconds());
      }
    }
    function setHours(hours, minutes, seconds) {
      if (self.latestSelectedDateObj !== void 0) {
        self.latestSelectedDateObj.setHours(hours % 24, minutes, seconds || 0, 0);
      }
      if (!self.hourElement || !self.minuteElement || self.isMobile)
        return;
      self.hourElement.value = pad(!self.config.time_24hr ? (12 + hours) % 12 + 12 * int(hours % 12 === 0) : hours);
      self.minuteElement.value = pad(minutes);
      if (self.amPM !== void 0)
        self.amPM.textContent = self.l10n.amPM[int(hours >= 12)];
      if (self.secondElement !== void 0)
        self.secondElement.value = pad(seconds);
    }
    function onYearInput(event) {
      var eventTarget = getEventTarget(event);
      var year = parseInt(eventTarget.value) + (event.delta || 0);
      if (year / 1e3 > 1 || event.key === "Enter" && !/[^\d]/.test(year.toString())) {
        changeYear(year);
      }
    }
    function bind(element2, event, handler, options) {
      if (event instanceof Array)
        return event.forEach(function(ev) {
          return bind(element2, ev, handler, options);
        });
      if (element2 instanceof Array)
        return element2.forEach(function(el) {
          return bind(el, event, handler, options);
        });
      element2.addEventListener(event, handler, options);
      self._handlers.push({
        remove: function() {
          return element2.removeEventListener(event, handler, options);
        }
      });
    }
    function triggerChange() {
      triggerEvent("onChange");
    }
    function bindEvents() {
      if (self.config.wrap) {
        ["open", "close", "toggle", "clear"].forEach(function(evt) {
          Array.prototype.forEach.call(self.element.querySelectorAll("[data-" + evt + "]"), function(el) {
            return bind(el, "click", self[evt]);
          });
        });
      }
      if (self.isMobile) {
        setupMobile();
        return;
      }
      var debouncedResize = debounce(onResize, 50);
      self._debouncedChange = debounce(triggerChange, DEBOUNCED_CHANGE_MS);
      if (self.daysContainer && !/iPhone|iPad|iPod/i.test(navigator.userAgent))
        bind(self.daysContainer, "mouseover", function(e) {
          if (self.config.mode === "range")
            onMouseOver(getEventTarget(e));
        });
      bind(self._input, "keydown", onKeyDown);
      if (self.calendarContainer !== void 0) {
        bind(self.calendarContainer, "keydown", onKeyDown);
      }
      if (!self.config.inline && !self.config.static)
        bind(window, "resize", debouncedResize);
      if (window.ontouchstart !== void 0)
        bind(window.document, "touchstart", documentClick);
      else
        bind(window.document, "mousedown", documentClick);
      bind(window.document, "focus", documentClick, { capture: true });
      if (self.config.clickOpens === true) {
        bind(self._input, "focus", self.open);
        bind(self._input, "click", self.open);
      }
      if (self.daysContainer !== void 0) {
        bind(self.monthNav, "click", onMonthNavClick);
        bind(self.monthNav, ["keyup", "increment"], onYearInput);
        bind(self.daysContainer, "click", selectDate);
      }
      if (self.timeContainer !== void 0 && self.minuteElement !== void 0 && self.hourElement !== void 0) {
        var selText = function(e) {
          return getEventTarget(e).select();
        };
        bind(self.timeContainer, ["increment"], updateTime);
        bind(self.timeContainer, "blur", updateTime, { capture: true });
        bind(self.timeContainer, "click", timeIncrement);
        bind([self.hourElement, self.minuteElement], ["focus", "click"], selText);
        if (self.secondElement !== void 0)
          bind(self.secondElement, "focus", function() {
            return self.secondElement && self.secondElement.select();
          });
        if (self.amPM !== void 0) {
          bind(self.amPM, "click", function(e) {
            updateTime(e);
          });
        }
      }
      if (self.config.allowInput) {
        bind(self._input, "blur", onBlur);
      }
    }
    function jumpToDate(jumpDate, triggerChange2) {
      var jumpTo = jumpDate !== void 0 ? self.parseDate(jumpDate) : self.latestSelectedDateObj || (self.config.minDate && self.config.minDate > self.now ? self.config.minDate : self.config.maxDate && self.config.maxDate < self.now ? self.config.maxDate : self.now);
      var oldYear = self.currentYear;
      var oldMonth = self.currentMonth;
      try {
        if (jumpTo !== void 0) {
          self.currentYear = jumpTo.getFullYear();
          self.currentMonth = jumpTo.getMonth();
        }
      } catch (e) {
        e.message = "Invalid date supplied: " + jumpTo;
        self.config.errorHandler(e);
      }
      if (triggerChange2 && self.currentYear !== oldYear) {
        triggerEvent("onYearChange");
        buildMonthSwitch();
      }
      if (triggerChange2 && (self.currentYear !== oldYear || self.currentMonth !== oldMonth)) {
        triggerEvent("onMonthChange");
      }
      self.redraw();
    }
    function timeIncrement(e) {
      var eventTarget = getEventTarget(e);
      if (~eventTarget.className.indexOf("arrow"))
        incrementNumInput(e, eventTarget.classList.contains("arrowUp") ? 1 : -1);
    }
    function incrementNumInput(e, delta, inputElem) {
      var target = e && getEventTarget(e);
      var input = inputElem || target && target.parentNode && target.parentNode.firstChild;
      var event = createEvent("increment");
      event.delta = delta;
      input && input.dispatchEvent(event);
    }
    function build() {
      var fragment = window.document.createDocumentFragment();
      self.calendarContainer = createElement("div", "flatpickr-calendar");
      self.calendarContainer.tabIndex = -1;
      if (!self.config.noCalendar) {
        fragment.appendChild(buildMonthNav());
        self.innerContainer = createElement("div", "flatpickr-innerContainer");
        if (self.config.weekNumbers) {
          var _a = buildWeeks(), weekWrapper = _a.weekWrapper, weekNumbers = _a.weekNumbers;
          self.innerContainer.appendChild(weekWrapper);
          self.weekNumbers = weekNumbers;
          self.weekWrapper = weekWrapper;
        }
        self.rContainer = createElement("div", "flatpickr-rContainer");
        self.rContainer.appendChild(buildWeekdays());
        if (!self.daysContainer) {
          self.daysContainer = createElement("div", "flatpickr-days");
          self.daysContainer.tabIndex = -1;
        }
        buildDays();
        self.rContainer.appendChild(self.daysContainer);
        self.innerContainer.appendChild(self.rContainer);
        fragment.appendChild(self.innerContainer);
      }
      if (self.config.enableTime) {
        fragment.appendChild(buildTime());
      }
      toggleClass(self.calendarContainer, "rangeMode", self.config.mode === "range");
      toggleClass(self.calendarContainer, "animate", self.config.animate === true);
      toggleClass(self.calendarContainer, "multiMonth", self.config.showMonths > 1);
      self.calendarContainer.appendChild(fragment);
      var customAppend = self.config.appendTo !== void 0 && self.config.appendTo.nodeType !== void 0;
      if (self.config.inline || self.config.static) {
        self.calendarContainer.classList.add(self.config.inline ? "inline" : "static");
        if (self.config.inline) {
          if (!customAppend && self.element.parentNode)
            self.element.parentNode.insertBefore(self.calendarContainer, self._input.nextSibling);
          else if (self.config.appendTo !== void 0)
            self.config.appendTo.appendChild(self.calendarContainer);
        }
        if (self.config.static) {
          var wrapper = createElement("div", "flatpickr-wrapper");
          if (self.element.parentNode)
            self.element.parentNode.insertBefore(wrapper, self.element);
          wrapper.appendChild(self.element);
          if (self.altInput)
            wrapper.appendChild(self.altInput);
          wrapper.appendChild(self.calendarContainer);
        }
      }
      if (!self.config.static && !self.config.inline)
        (self.config.appendTo !== void 0 ? self.config.appendTo : window.document.body).appendChild(self.calendarContainer);
    }
    function createDay(className, date, _dayNumber, i) {
      var dateIsEnabled = isEnabled(date, true), dayElement = createElement("span", className, date.getDate().toString());
      dayElement.dateObj = date;
      dayElement.$i = i;
      dayElement.setAttribute("aria-label", self.formatDate(date, self.config.ariaDateFormat));
      if (className.indexOf("hidden") === -1 && compareDates(date, self.now) === 0) {
        self.todayDateElem = dayElement;
        dayElement.classList.add("today");
        dayElement.setAttribute("aria-current", "date");
      }
      if (dateIsEnabled) {
        dayElement.tabIndex = -1;
        if (isDateSelected(date)) {
          dayElement.classList.add("selected");
          self.selectedDateElem = dayElement;
          if (self.config.mode === "range") {
            toggleClass(dayElement, "startRange", self.selectedDates[0] && compareDates(date, self.selectedDates[0], true) === 0);
            toggleClass(dayElement, "endRange", self.selectedDates[1] && compareDates(date, self.selectedDates[1], true) === 0);
            if (className === "nextMonthDay")
              dayElement.classList.add("inRange");
          }
        }
      } else {
        dayElement.classList.add("flatpickr-disabled");
      }
      if (self.config.mode === "range") {
        if (isDateInRange(date) && !isDateSelected(date))
          dayElement.classList.add("inRange");
      }
      if (self.weekNumbers && self.config.showMonths === 1 && className !== "prevMonthDay" && i % 7 === 6) {
        self.weekNumbers.insertAdjacentHTML("beforeend", "<span class='flatpickr-day'>" + self.config.getWeek(date) + "</span>");
      }
      triggerEvent("onDayCreate", dayElement);
      return dayElement;
    }
    function focusOnDayElem(targetNode) {
      targetNode.focus();
      if (self.config.mode === "range")
        onMouseOver(targetNode);
    }
    function getFirstAvailableDay(delta) {
      var startMonth = delta > 0 ? 0 : self.config.showMonths - 1;
      var endMonth = delta > 0 ? self.config.showMonths : -1;
      for (var m = startMonth; m != endMonth; m += delta) {
        var month = self.daysContainer.children[m];
        var startIndex = delta > 0 ? 0 : month.children.length - 1;
        var endIndex = delta > 0 ? month.children.length : -1;
        for (var i = startIndex; i != endIndex; i += delta) {
          var c = month.children[i];
          if (c.className.indexOf("hidden") === -1 && isEnabled(c.dateObj))
            return c;
        }
      }
      return void 0;
    }
    function getNextAvailableDay(current, delta) {
      var givenMonth = current.className.indexOf("Month") === -1 ? current.dateObj.getMonth() : self.currentMonth;
      var endMonth = delta > 0 ? self.config.showMonths : -1;
      var loopDelta = delta > 0 ? 1 : -1;
      for (var m = givenMonth - self.currentMonth; m != endMonth; m += loopDelta) {
        var month = self.daysContainer.children[m];
        var startIndex = givenMonth - self.currentMonth === m ? current.$i + delta : delta < 0 ? month.children.length - 1 : 0;
        var numMonthDays = month.children.length;
        for (var i = startIndex; i >= 0 && i < numMonthDays && i != (delta > 0 ? numMonthDays : -1); i += loopDelta) {
          var c = month.children[i];
          if (c.className.indexOf("hidden") === -1 && isEnabled(c.dateObj) && Math.abs(current.$i - i) >= Math.abs(delta))
            return focusOnDayElem(c);
        }
      }
      self.changeMonth(loopDelta);
      focusOnDay(getFirstAvailableDay(loopDelta), 0);
      return void 0;
    }
    function focusOnDay(current, offset) {
      var activeElement = getClosestActiveElement();
      var dayFocused = isInView(activeElement || document.body);
      var startElem = current !== void 0 ? current : dayFocused ? activeElement : self.selectedDateElem !== void 0 && isInView(self.selectedDateElem) ? self.selectedDateElem : self.todayDateElem !== void 0 && isInView(self.todayDateElem) ? self.todayDateElem : getFirstAvailableDay(offset > 0 ? 1 : -1);
      if (startElem === void 0) {
        self._input.focus();
      } else if (!dayFocused) {
        focusOnDayElem(startElem);
      } else {
        getNextAvailableDay(startElem, offset);
      }
    }
    function buildMonthDays(year, month) {
      var firstOfMonth = (new Date(year, month, 1).getDay() - self.l10n.firstDayOfWeek + 7) % 7;
      var prevMonthDays = self.utils.getDaysInMonth((month - 1 + 12) % 12, year);
      var daysInMonth = self.utils.getDaysInMonth(month, year), days = window.document.createDocumentFragment(), isMultiMonth = self.config.showMonths > 1, prevMonthDayClass = isMultiMonth ? "prevMonthDay hidden" : "prevMonthDay", nextMonthDayClass = isMultiMonth ? "nextMonthDay hidden" : "nextMonthDay";
      var dayNumber = prevMonthDays + 1 - firstOfMonth, dayIndex = 0;
      for (; dayNumber <= prevMonthDays; dayNumber++, dayIndex++) {
        days.appendChild(createDay("flatpickr-day " + prevMonthDayClass, new Date(year, month - 1, dayNumber), dayNumber, dayIndex));
      }
      for (dayNumber = 1; dayNumber <= daysInMonth; dayNumber++, dayIndex++) {
        days.appendChild(createDay("flatpickr-day", new Date(year, month, dayNumber), dayNumber, dayIndex));
      }
      for (var dayNum = daysInMonth + 1; dayNum <= 42 - firstOfMonth && (self.config.showMonths === 1 || dayIndex % 7 !== 0); dayNum++, dayIndex++) {
        days.appendChild(createDay("flatpickr-day " + nextMonthDayClass, new Date(year, month + 1, dayNum % daysInMonth), dayNum, dayIndex));
      }
      var dayContainer = createElement("div", "dayContainer");
      dayContainer.appendChild(days);
      return dayContainer;
    }
    function buildDays() {
      if (self.daysContainer === void 0) {
        return;
      }
      clearNode(self.daysContainer);
      if (self.weekNumbers)
        clearNode(self.weekNumbers);
      var frag = document.createDocumentFragment();
      for (var i = 0; i < self.config.showMonths; i++) {
        var d = new Date(self.currentYear, self.currentMonth, 1);
        d.setMonth(self.currentMonth + i);
        frag.appendChild(buildMonthDays(d.getFullYear(), d.getMonth()));
      }
      self.daysContainer.appendChild(frag);
      self.days = self.daysContainer.firstChild;
      if (self.config.mode === "range" && self.selectedDates.length === 1) {
        onMouseOver();
      }
    }
    function buildMonthSwitch() {
      if (self.config.showMonths > 1 || self.config.monthSelectorType !== "dropdown")
        return;
      var shouldBuildMonth = function(month2) {
        if (self.config.minDate !== void 0 && self.currentYear === self.config.minDate.getFullYear() && month2 < self.config.minDate.getMonth()) {
          return false;
        }
        return !(self.config.maxDate !== void 0 && self.currentYear === self.config.maxDate.getFullYear() && month2 > self.config.maxDate.getMonth());
      };
      self.monthsDropdownContainer.tabIndex = -1;
      self.monthsDropdownContainer.innerHTML = "";
      for (var i = 0; i < 12; i++) {
        if (!shouldBuildMonth(i))
          continue;
        var month = createElement("option", "flatpickr-monthDropdown-month");
        month.value = new Date(self.currentYear, i).getMonth().toString();
        month.textContent = monthToStr(i, self.config.shorthandCurrentMonth, self.l10n);
        month.tabIndex = -1;
        if (self.currentMonth === i) {
          month.selected = true;
        }
        self.monthsDropdownContainer.appendChild(month);
      }
    }
    function buildMonth() {
      var container = createElement("div", "flatpickr-month");
      var monthNavFragment = window.document.createDocumentFragment();
      var monthElement;
      if (self.config.showMonths > 1 || self.config.monthSelectorType === "static") {
        monthElement = createElement("span", "cur-month");
      } else {
        self.monthsDropdownContainer = createElement("select", "flatpickr-monthDropdown-months");
        self.monthsDropdownContainer.setAttribute("aria-label", self.l10n.monthAriaLabel);
        bind(self.monthsDropdownContainer, "change", function(e) {
          var target = getEventTarget(e);
          var selectedMonth = parseInt(target.value, 10);
          self.changeMonth(selectedMonth - self.currentMonth);
          triggerEvent("onMonthChange");
        });
        buildMonthSwitch();
        monthElement = self.monthsDropdownContainer;
      }
      var yearInput = createNumberInput("cur-year", { tabindex: "-1" });
      var yearElement = yearInput.getElementsByTagName("input")[0];
      yearElement.setAttribute("aria-label", self.l10n.yearAriaLabel);
      if (self.config.minDate) {
        yearElement.setAttribute("min", self.config.minDate.getFullYear().toString());
      }
      if (self.config.maxDate) {
        yearElement.setAttribute("max", self.config.maxDate.getFullYear().toString());
        yearElement.disabled = !!self.config.minDate && self.config.minDate.getFullYear() === self.config.maxDate.getFullYear();
      }
      var currentMonth = createElement("div", "flatpickr-current-month");
      currentMonth.appendChild(monthElement);
      currentMonth.appendChild(yearInput);
      monthNavFragment.appendChild(currentMonth);
      container.appendChild(monthNavFragment);
      return {
        container,
        yearElement,
        monthElement
      };
    }
    function buildMonths() {
      clearNode(self.monthNav);
      self.monthNav.appendChild(self.prevMonthNav);
      if (self.config.showMonths) {
        self.yearElements = [];
        self.monthElements = [];
      }
      for (var m = self.config.showMonths; m--; ) {
        var month = buildMonth();
        self.yearElements.push(month.yearElement);
        self.monthElements.push(month.monthElement);
        self.monthNav.appendChild(month.container);
      }
      self.monthNav.appendChild(self.nextMonthNav);
    }
    function buildMonthNav() {
      self.monthNav = createElement("div", "flatpickr-months");
      self.yearElements = [];
      self.monthElements = [];
      self.prevMonthNav = createElement("span", "flatpickr-prev-month");
      self.prevMonthNav.innerHTML = self.config.prevArrow;
      self.nextMonthNav = createElement("span", "flatpickr-next-month");
      self.nextMonthNav.innerHTML = self.config.nextArrow;
      buildMonths();
      Object.defineProperty(self, "_hidePrevMonthArrow", {
        get: function() {
          return self.__hidePrevMonthArrow;
        },
        set: function(bool) {
          if (self.__hidePrevMonthArrow !== bool) {
            toggleClass(self.prevMonthNav, "flatpickr-disabled", bool);
            self.__hidePrevMonthArrow = bool;
          }
        }
      });
      Object.defineProperty(self, "_hideNextMonthArrow", {
        get: function() {
          return self.__hideNextMonthArrow;
        },
        set: function(bool) {
          if (self.__hideNextMonthArrow !== bool) {
            toggleClass(self.nextMonthNav, "flatpickr-disabled", bool);
            self.__hideNextMonthArrow = bool;
          }
        }
      });
      self.currentYearElement = self.yearElements[0];
      updateNavigationCurrentMonth();
      return self.monthNav;
    }
    function buildTime() {
      self.calendarContainer.classList.add("hasTime");
      if (self.config.noCalendar)
        self.calendarContainer.classList.add("noCalendar");
      var defaults2 = getDefaultHours(self.config);
      self.timeContainer = createElement("div", "flatpickr-time");
      self.timeContainer.tabIndex = -1;
      var separator = createElement("span", "flatpickr-time-separator", ":");
      var hourInput = createNumberInput("flatpickr-hour", {
        "aria-label": self.l10n.hourAriaLabel
      });
      self.hourElement = hourInput.getElementsByTagName("input")[0];
      var minuteInput = createNumberInput("flatpickr-minute", {
        "aria-label": self.l10n.minuteAriaLabel
      });
      self.minuteElement = minuteInput.getElementsByTagName("input")[0];
      self.hourElement.tabIndex = self.minuteElement.tabIndex = -1;
      self.hourElement.value = pad(self.latestSelectedDateObj ? self.latestSelectedDateObj.getHours() : self.config.time_24hr ? defaults2.hours : military2ampm(defaults2.hours));
      self.minuteElement.value = pad(self.latestSelectedDateObj ? self.latestSelectedDateObj.getMinutes() : defaults2.minutes);
      self.hourElement.setAttribute("step", self.config.hourIncrement.toString());
      self.minuteElement.setAttribute("step", self.config.minuteIncrement.toString());
      self.hourElement.setAttribute("min", self.config.time_24hr ? "0" : "1");
      self.hourElement.setAttribute("max", self.config.time_24hr ? "23" : "12");
      self.hourElement.setAttribute("maxlength", "2");
      self.minuteElement.setAttribute("min", "0");
      self.minuteElement.setAttribute("max", "59");
      self.minuteElement.setAttribute("maxlength", "2");
      self.timeContainer.appendChild(hourInput);
      self.timeContainer.appendChild(separator);
      self.timeContainer.appendChild(minuteInput);
      if (self.config.time_24hr)
        self.timeContainer.classList.add("time24hr");
      if (self.config.enableSeconds) {
        self.timeContainer.classList.add("hasSeconds");
        var secondInput = createNumberInput("flatpickr-second");
        self.secondElement = secondInput.getElementsByTagName("input")[0];
        self.secondElement.value = pad(self.latestSelectedDateObj ? self.latestSelectedDateObj.getSeconds() : defaults2.seconds);
        self.secondElement.setAttribute("step", self.minuteElement.getAttribute("step"));
        self.secondElement.setAttribute("min", "0");
        self.secondElement.setAttribute("max", "59");
        self.secondElement.setAttribute("maxlength", "2");
        self.timeContainer.appendChild(createElement("span", "flatpickr-time-separator", ":"));
        self.timeContainer.appendChild(secondInput);
      }
      if (!self.config.time_24hr) {
        self.amPM = createElement("span", "flatpickr-am-pm", self.l10n.amPM[int((self.latestSelectedDateObj ? self.hourElement.value : self.config.defaultHour) > 11)]);
        self.amPM.title = self.l10n.toggleTitle;
        self.amPM.tabIndex = -1;
        self.timeContainer.appendChild(self.amPM);
      }
      return self.timeContainer;
    }
    function buildWeekdays() {
      if (!self.weekdayContainer)
        self.weekdayContainer = createElement("div", "flatpickr-weekdays");
      else
        clearNode(self.weekdayContainer);
      for (var i = self.config.showMonths; i--; ) {
        var container = createElement("div", "flatpickr-weekdaycontainer");
        self.weekdayContainer.appendChild(container);
      }
      updateWeekdays();
      return self.weekdayContainer;
    }
    function updateWeekdays() {
      if (!self.weekdayContainer) {
        return;
      }
      var firstDayOfWeek = self.l10n.firstDayOfWeek;
      var weekdays = __spreadArrays(self.l10n.weekdays.shorthand);
      if (firstDayOfWeek > 0 && firstDayOfWeek < weekdays.length) {
        weekdays = __spreadArrays(weekdays.splice(firstDayOfWeek, weekdays.length), weekdays.splice(0, firstDayOfWeek));
      }
      for (var i = self.config.showMonths; i--; ) {
        self.weekdayContainer.children[i].innerHTML = "\n      <span class='flatpickr-weekday'>\n        " + weekdays.join("</span><span class='flatpickr-weekday'>") + "\n      </span>\n      ";
      }
    }
    function buildWeeks() {
      self.calendarContainer.classList.add("hasWeeks");
      var weekWrapper = createElement("div", "flatpickr-weekwrapper");
      weekWrapper.appendChild(createElement("span", "flatpickr-weekday", self.l10n.weekAbbreviation));
      var weekNumbers = createElement("div", "flatpickr-weeks");
      weekWrapper.appendChild(weekNumbers);
      return {
        weekWrapper,
        weekNumbers
      };
    }
    function changeMonth(value, isOffset) {
      if (isOffset === void 0) {
        isOffset = true;
      }
      var delta = isOffset ? value : value - self.currentMonth;
      if (delta < 0 && self._hidePrevMonthArrow === true || delta > 0 && self._hideNextMonthArrow === true)
        return;
      self.currentMonth += delta;
      if (self.currentMonth < 0 || self.currentMonth > 11) {
        self.currentYear += self.currentMonth > 11 ? 1 : -1;
        self.currentMonth = (self.currentMonth + 12) % 12;
        triggerEvent("onYearChange");
        buildMonthSwitch();
      }
      buildDays();
      triggerEvent("onMonthChange");
      updateNavigationCurrentMonth();
    }
    function clear(triggerChangeEvent, toInitial) {
      if (triggerChangeEvent === void 0) {
        triggerChangeEvent = true;
      }
      if (toInitial === void 0) {
        toInitial = true;
      }
      self.input.value = "";
      if (self.altInput !== void 0)
        self.altInput.value = "";
      if (self.mobileInput !== void 0)
        self.mobileInput.value = "";
      self.selectedDates = [];
      self.latestSelectedDateObj = void 0;
      if (toInitial === true) {
        self.currentYear = self._initialDate.getFullYear();
        self.currentMonth = self._initialDate.getMonth();
      }
      if (self.config.enableTime === true) {
        var _a = getDefaultHours(self.config), hours = _a.hours, minutes = _a.minutes, seconds = _a.seconds;
        setHours(hours, minutes, seconds);
      }
      self.redraw();
      if (triggerChangeEvent)
        triggerEvent("onChange");
    }
    function close() {
      self.isOpen = false;
      if (!self.isMobile) {
        if (self.calendarContainer !== void 0) {
          self.calendarContainer.classList.remove("open");
        }
        if (self._input !== void 0) {
          self._input.classList.remove("active");
        }
      }
      triggerEvent("onClose");
    }
    function destroy() {
      if (self.config !== void 0)
        triggerEvent("onDestroy");
      for (var i = self._handlers.length; i--; ) {
        self._handlers[i].remove();
      }
      self._handlers = [];
      if (self.mobileInput) {
        if (self.mobileInput.parentNode)
          self.mobileInput.parentNode.removeChild(self.mobileInput);
        self.mobileInput = void 0;
      } else if (self.calendarContainer && self.calendarContainer.parentNode) {
        if (self.config.static && self.calendarContainer.parentNode) {
          var wrapper = self.calendarContainer.parentNode;
          wrapper.lastChild && wrapper.removeChild(wrapper.lastChild);
          if (wrapper.parentNode) {
            while (wrapper.firstChild)
              wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
            wrapper.parentNode.removeChild(wrapper);
          }
        } else
          self.calendarContainer.parentNode.removeChild(self.calendarContainer);
      }
      if (self.altInput) {
        self.input.type = "text";
        if (self.altInput.parentNode)
          self.altInput.parentNode.removeChild(self.altInput);
        delete self.altInput;
      }
      if (self.input) {
        self.input.type = self.input._type;
        self.input.classList.remove("flatpickr-input");
        self.input.removeAttribute("readonly");
      }
      [
        "_showTimeInput",
        "latestSelectedDateObj",
        "_hideNextMonthArrow",
        "_hidePrevMonthArrow",
        "__hideNextMonthArrow",
        "__hidePrevMonthArrow",
        "isMobile",
        "isOpen",
        "selectedDateElem",
        "minDateHasTime",
        "maxDateHasTime",
        "days",
        "daysContainer",
        "_input",
        "_positionElement",
        "innerContainer",
        "rContainer",
        "monthNav",
        "todayDateElem",
        "calendarContainer",
        "weekdayContainer",
        "prevMonthNav",
        "nextMonthNav",
        "monthsDropdownContainer",
        "currentMonthElement",
        "currentYearElement",
        "navigationCurrentMonth",
        "selectedDateElem",
        "config"
      ].forEach(function(k) {
        try {
          delete self[k];
        } catch (_) {
        }
      });
    }
    function isCalendarElem(elem) {
      return self.calendarContainer.contains(elem);
    }
    function documentClick(e) {
      if (self.isOpen && !self.config.inline) {
        var eventTarget_1 = getEventTarget(e);
        var isCalendarElement = isCalendarElem(eventTarget_1);
        var isInput = eventTarget_1 === self.input || eventTarget_1 === self.altInput || self.element.contains(eventTarget_1) || e.path && e.path.indexOf && (~e.path.indexOf(self.input) || ~e.path.indexOf(self.altInput));
        var lostFocus = !isInput && !isCalendarElement && !isCalendarElem(e.relatedTarget);
        var isIgnored = !self.config.ignoredFocusElements.some(function(elem) {
          return elem.contains(eventTarget_1);
        });
        if (lostFocus && isIgnored) {
          if (self.config.allowInput) {
            self.setDate(self._input.value, false, self.config.altInput ? self.config.altFormat : self.config.dateFormat);
          }
          if (self.timeContainer !== void 0 && self.minuteElement !== void 0 && self.hourElement !== void 0 && self.input.value !== "" && self.input.value !== void 0) {
            updateTime();
          }
          self.close();
          if (self.config && self.config.mode === "range" && self.selectedDates.length === 1)
            self.clear(false);
        }
      }
    }
    function changeYear(newYear) {
      if (!newYear || self.config.minDate && newYear < self.config.minDate.getFullYear() || self.config.maxDate && newYear > self.config.maxDate.getFullYear())
        return;
      var newYearNum = newYear, isNewYear = self.currentYear !== newYearNum;
      self.currentYear = newYearNum || self.currentYear;
      if (self.config.maxDate && self.currentYear === self.config.maxDate.getFullYear()) {
        self.currentMonth = Math.min(self.config.maxDate.getMonth(), self.currentMonth);
      } else if (self.config.minDate && self.currentYear === self.config.minDate.getFullYear()) {
        self.currentMonth = Math.max(self.config.minDate.getMonth(), self.currentMonth);
      }
      if (isNewYear) {
        self.redraw();
        triggerEvent("onYearChange");
        buildMonthSwitch();
      }
    }
    function isEnabled(date, timeless) {
      var _a;
      if (timeless === void 0) {
        timeless = true;
      }
      var dateToCheck = self.parseDate(date, void 0, timeless);
      if (self.config.minDate && dateToCheck && compareDates(dateToCheck, self.config.minDate, timeless !== void 0 ? timeless : !self.minDateHasTime) < 0 || self.config.maxDate && dateToCheck && compareDates(dateToCheck, self.config.maxDate, timeless !== void 0 ? timeless : !self.maxDateHasTime) > 0)
        return false;
      if (!self.config.enable && self.config.disable.length === 0)
        return true;
      if (dateToCheck === void 0)
        return false;
      var bool = !!self.config.enable, array = (_a = self.config.enable) !== null && _a !== void 0 ? _a : self.config.disable;
      for (var i = 0, d = void 0; i < array.length; i++) {
        d = array[i];
        if (typeof d === "function" && d(dateToCheck))
          return bool;
        else if (d instanceof Date && dateToCheck !== void 0 && d.getTime() === dateToCheck.getTime())
          return bool;
        else if (typeof d === "string") {
          var parsed = self.parseDate(d, void 0, true);
          return parsed && parsed.getTime() === dateToCheck.getTime() ? bool : !bool;
        } else if (typeof d === "object" && dateToCheck !== void 0 && d.from && d.to && dateToCheck.getTime() >= d.from.getTime() && dateToCheck.getTime() <= d.to.getTime())
          return bool;
      }
      return !bool;
    }
    function isInView(elem) {
      if (self.daysContainer !== void 0)
        return elem.className.indexOf("hidden") === -1 && elem.className.indexOf("flatpickr-disabled") === -1 && self.daysContainer.contains(elem);
      return false;
    }
    function onBlur(e) {
      var isInput = e.target === self._input;
      var valueChanged = self._input.value.trimEnd() !== getDateStr();
      if (isInput && valueChanged && !(e.relatedTarget && isCalendarElem(e.relatedTarget))) {
        self.setDate(self._input.value, true, e.target === self.altInput ? self.config.altFormat : self.config.dateFormat);
      }
    }
    function onKeyDown(e) {
      var eventTarget = getEventTarget(e);
      var isInput = self.config.wrap ? element.contains(eventTarget) : eventTarget === self._input;
      var allowInput = self.config.allowInput;
      var allowKeydown = self.isOpen && (!allowInput || !isInput);
      var allowInlineKeydown = self.config.inline && isInput && !allowInput;
      if (e.keyCode === 13 && isInput) {
        if (allowInput) {
          self.setDate(self._input.value, true, eventTarget === self.altInput ? self.config.altFormat : self.config.dateFormat);
          self.close();
          return eventTarget.blur();
        } else {
          self.open();
        }
      } else if (isCalendarElem(eventTarget) || allowKeydown || allowInlineKeydown) {
        var isTimeObj = !!self.timeContainer && self.timeContainer.contains(eventTarget);
        switch (e.keyCode) {
          case 13:
            if (isTimeObj) {
              e.preventDefault();
              updateTime();
              focusAndClose();
            } else
              selectDate(e);
            break;
          case 27:
            e.preventDefault();
            focusAndClose();
            break;
          case 8:
          case 46:
            if (isInput && !self.config.allowInput) {
              e.preventDefault();
              self.clear();
            }
            break;
          case 37:
          case 39:
            if (!isTimeObj && !isInput) {
              e.preventDefault();
              var activeElement = getClosestActiveElement();
              if (self.daysContainer !== void 0 && (allowInput === false || activeElement && isInView(activeElement))) {
                var delta_1 = e.keyCode === 39 ? 1 : -1;
                if (!e.ctrlKey)
                  focusOnDay(void 0, delta_1);
                else {
                  e.stopPropagation();
                  changeMonth(delta_1);
                  focusOnDay(getFirstAvailableDay(1), 0);
                }
              }
            } else if (self.hourElement)
              self.hourElement.focus();
            break;
          case 38:
          case 40:
            e.preventDefault();
            var delta = e.keyCode === 40 ? 1 : -1;
            if (self.daysContainer && eventTarget.$i !== void 0 || eventTarget === self.input || eventTarget === self.altInput) {
              if (e.ctrlKey) {
                e.stopPropagation();
                changeYear(self.currentYear - delta);
                focusOnDay(getFirstAvailableDay(1), 0);
              } else if (!isTimeObj)
                focusOnDay(void 0, delta * 7);
            } else if (eventTarget === self.currentYearElement) {
              changeYear(self.currentYear - delta);
            } else if (self.config.enableTime) {
              if (!isTimeObj && self.hourElement)
                self.hourElement.focus();
              updateTime(e);
              self._debouncedChange();
            }
            break;
          case 9:
            if (isTimeObj) {
              var elems = [
                self.hourElement,
                self.minuteElement,
                self.secondElement,
                self.amPM
              ].concat(self.pluginElements).filter(function(x) {
                return x;
              });
              var i = elems.indexOf(eventTarget);
              if (i !== -1) {
                var target = elems[i + (e.shiftKey ? -1 : 1)];
                e.preventDefault();
                (target || self._input).focus();
              }
            } else if (!self.config.noCalendar && self.daysContainer && self.daysContainer.contains(eventTarget) && e.shiftKey) {
              e.preventDefault();
              self._input.focus();
            }
            break;
          default:
            break;
        }
      }
      if (self.amPM !== void 0 && eventTarget === self.amPM) {
        switch (e.key) {
          case self.l10n.amPM[0].charAt(0):
          case self.l10n.amPM[0].charAt(0).toLowerCase():
            self.amPM.textContent = self.l10n.amPM[0];
            setHoursFromInputs();
            updateValue();
            break;
          case self.l10n.amPM[1].charAt(0):
          case self.l10n.amPM[1].charAt(0).toLowerCase():
            self.amPM.textContent = self.l10n.amPM[1];
            setHoursFromInputs();
            updateValue();
            break;
        }
      }
      if (isInput || isCalendarElem(eventTarget)) {
        triggerEvent("onKeyDown", e);
      }
    }
    function onMouseOver(elem, cellClass) {
      if (cellClass === void 0) {
        cellClass = "flatpickr-day";
      }
      if (self.selectedDates.length !== 1 || elem && (!elem.classList.contains(cellClass) || elem.classList.contains("flatpickr-disabled")))
        return;
      var hoverDate = elem ? elem.dateObj.getTime() : self.days.firstElementChild.dateObj.getTime(), initialDate = self.parseDate(self.selectedDates[0], void 0, true).getTime(), rangeStartDate = Math.min(hoverDate, self.selectedDates[0].getTime()), rangeEndDate = Math.max(hoverDate, self.selectedDates[0].getTime());
      var containsDisabled = false;
      var minRange = 0, maxRange = 0;
      for (var t = rangeStartDate; t < rangeEndDate; t += duration.DAY) {
        if (!isEnabled(new Date(t), true)) {
          containsDisabled = containsDisabled || t > rangeStartDate && t < rangeEndDate;
          if (t < initialDate && (!minRange || t > minRange))
            minRange = t;
          else if (t > initialDate && (!maxRange || t < maxRange))
            maxRange = t;
        }
      }
      var hoverableCells = Array.from(self.rContainer.querySelectorAll("*:nth-child(-n+" + self.config.showMonths + ") > ." + cellClass));
      hoverableCells.forEach(function(dayElem) {
        var date = dayElem.dateObj;
        var timestamp = date.getTime();
        var outOfRange = minRange > 0 && timestamp < minRange || maxRange > 0 && timestamp > maxRange;
        if (outOfRange) {
          dayElem.classList.add("notAllowed");
          ["inRange", "startRange", "endRange"].forEach(function(c) {
            dayElem.classList.remove(c);
          });
          return;
        } else if (containsDisabled && !outOfRange)
          return;
        ["startRange", "inRange", "endRange", "notAllowed"].forEach(function(c) {
          dayElem.classList.remove(c);
        });
        if (elem !== void 0) {
          elem.classList.add(hoverDate <= self.selectedDates[0].getTime() ? "startRange" : "endRange");
          if (initialDate < hoverDate && timestamp === initialDate)
            dayElem.classList.add("startRange");
          else if (initialDate > hoverDate && timestamp === initialDate)
            dayElem.classList.add("endRange");
          if (timestamp >= minRange && (maxRange === 0 || timestamp <= maxRange) && isBetween(timestamp, initialDate, hoverDate))
            dayElem.classList.add("inRange");
        }
      });
    }
    function onResize() {
      if (self.isOpen && !self.config.static && !self.config.inline)
        positionCalendar();
    }
    function open(e, positionElement) {
      if (positionElement === void 0) {
        positionElement = self._positionElement;
      }
      if (self.isMobile === true) {
        if (e) {
          e.preventDefault();
          var eventTarget = getEventTarget(e);
          if (eventTarget) {
            eventTarget.blur();
          }
        }
        if (self.mobileInput !== void 0) {
          self.mobileInput.focus();
          self.mobileInput.click();
        }
        triggerEvent("onOpen");
        return;
      } else if (self._input.disabled || self.config.inline) {
        return;
      }
      var wasOpen = self.isOpen;
      self.isOpen = true;
      if (!wasOpen) {
        self.calendarContainer.classList.add("open");
        self._input.classList.add("active");
        triggerEvent("onOpen");
        positionCalendar(positionElement);
      }
      if (self.config.enableTime === true && self.config.noCalendar === true) {
        if (self.config.allowInput === false && (e === void 0 || !self.timeContainer.contains(e.relatedTarget))) {
          setTimeout(function() {
            return self.hourElement.select();
          }, 50);
        }
      }
    }
    function minMaxDateSetter(type) {
      return function(date) {
        var dateObj = self.config["_" + type + "Date"] = self.parseDate(date, self.config.dateFormat);
        var inverseDateObj = self.config["_" + (type === "min" ? "max" : "min") + "Date"];
        if (dateObj !== void 0) {
          self[type === "min" ? "minDateHasTime" : "maxDateHasTime"] = dateObj.getHours() > 0 || dateObj.getMinutes() > 0 || dateObj.getSeconds() > 0;
        }
        if (self.selectedDates) {
          self.selectedDates = self.selectedDates.filter(function(d) {
            return isEnabled(d);
          });
          if (!self.selectedDates.length && type === "min")
            setHoursFromDate(dateObj);
          updateValue();
        }
        if (self.daysContainer) {
          redraw();
          if (dateObj !== void 0)
            self.currentYearElement[type] = dateObj.getFullYear().toString();
          else
            self.currentYearElement.removeAttribute(type);
          self.currentYearElement.disabled = !!inverseDateObj && dateObj !== void 0 && inverseDateObj.getFullYear() === dateObj.getFullYear();
        }
      };
    }
    function parseConfig() {
      var boolOpts = [
        "wrap",
        "weekNumbers",
        "allowInput",
        "allowInvalidPreload",
        "clickOpens",
        "time_24hr",
        "enableTime",
        "noCalendar",
        "altInput",
        "shorthandCurrentMonth",
        "inline",
        "static",
        "enableSeconds",
        "disableMobile"
      ];
      var userConfig = __assign(__assign({}, JSON.parse(JSON.stringify(element.dataset || {}))), instanceConfig);
      var formats2 = {};
      self.config.parseDate = userConfig.parseDate;
      self.config.formatDate = userConfig.formatDate;
      Object.defineProperty(self.config, "enable", {
        get: function() {
          return self.config._enable;
        },
        set: function(dates) {
          self.config._enable = parseDateRules(dates);
        }
      });
      Object.defineProperty(self.config, "disable", {
        get: function() {
          return self.config._disable;
        },
        set: function(dates) {
          self.config._disable = parseDateRules(dates);
        }
      });
      var timeMode = userConfig.mode === "time";
      if (!userConfig.dateFormat && (userConfig.enableTime || timeMode)) {
        var defaultDateFormat = flatpickr.defaultConfig.dateFormat || defaults.dateFormat;
        formats2.dateFormat = userConfig.noCalendar || timeMode ? "H:i" + (userConfig.enableSeconds ? ":S" : "") : defaultDateFormat + " H:i" + (userConfig.enableSeconds ? ":S" : "");
      }
      if (userConfig.altInput && (userConfig.enableTime || timeMode) && !userConfig.altFormat) {
        var defaultAltFormat = flatpickr.defaultConfig.altFormat || defaults.altFormat;
        formats2.altFormat = userConfig.noCalendar || timeMode ? "h:i" + (userConfig.enableSeconds ? ":S K" : " K") : defaultAltFormat + (" h:i" + (userConfig.enableSeconds ? ":S" : "") + " K");
      }
      Object.defineProperty(self.config, "minDate", {
        get: function() {
          return self.config._minDate;
        },
        set: minMaxDateSetter("min")
      });
      Object.defineProperty(self.config, "maxDate", {
        get: function() {
          return self.config._maxDate;
        },
        set: minMaxDateSetter("max")
      });
      var minMaxTimeSetter = function(type) {
        return function(val) {
          self.config[type === "min" ? "_minTime" : "_maxTime"] = self.parseDate(val, "H:i:S");
        };
      };
      Object.defineProperty(self.config, "minTime", {
        get: function() {
          return self.config._minTime;
        },
        set: minMaxTimeSetter("min")
      });
      Object.defineProperty(self.config, "maxTime", {
        get: function() {
          return self.config._maxTime;
        },
        set: minMaxTimeSetter("max")
      });
      if (userConfig.mode === "time") {
        self.config.noCalendar = true;
        self.config.enableTime = true;
      }
      Object.assign(self.config, formats2, userConfig);
      for (var i = 0; i < boolOpts.length; i++)
        self.config[boolOpts[i]] = self.config[boolOpts[i]] === true || self.config[boolOpts[i]] === "true";
      HOOKS.filter(function(hook) {
        return self.config[hook] !== void 0;
      }).forEach(function(hook) {
        self.config[hook] = arrayify(self.config[hook] || []).map(bindToInstance);
      });
      self.isMobile = !self.config.disableMobile && !self.config.inline && self.config.mode === "single" && !self.config.disable.length && !self.config.enable && !self.config.weekNumbers && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      for (var i = 0; i < self.config.plugins.length; i++) {
        var pluginConf = self.config.plugins[i](self) || {};
        for (var key in pluginConf) {
          if (HOOKS.indexOf(key) > -1) {
            self.config[key] = arrayify(pluginConf[key]).map(bindToInstance).concat(self.config[key]);
          } else if (typeof userConfig[key] === "undefined")
            self.config[key] = pluginConf[key];
        }
      }
      if (!userConfig.altInputClass) {
        self.config.altInputClass = getInputElem().className + " " + self.config.altInputClass;
      }
      triggerEvent("onParseConfig");
    }
    function getInputElem() {
      return self.config.wrap ? element.querySelector("[data-input]") : element;
    }
    function setupLocale() {
      if (typeof self.config.locale !== "object" && typeof flatpickr.l10ns[self.config.locale] === "undefined")
        self.config.errorHandler(new Error("flatpickr: invalid locale " + self.config.locale));
      self.l10n = __assign(__assign({}, flatpickr.l10ns.default), typeof self.config.locale === "object" ? self.config.locale : self.config.locale !== "default" ? flatpickr.l10ns[self.config.locale] : void 0);
      tokenRegex.D = "(" + self.l10n.weekdays.shorthand.join("|") + ")";
      tokenRegex.l = "(" + self.l10n.weekdays.longhand.join("|") + ")";
      tokenRegex.M = "(" + self.l10n.months.shorthand.join("|") + ")";
      tokenRegex.F = "(" + self.l10n.months.longhand.join("|") + ")";
      tokenRegex.K = "(" + self.l10n.amPM[0] + "|" + self.l10n.amPM[1] + "|" + self.l10n.amPM[0].toLowerCase() + "|" + self.l10n.amPM[1].toLowerCase() + ")";
      var userConfig = __assign(__assign({}, instanceConfig), JSON.parse(JSON.stringify(element.dataset || {})));
      if (userConfig.time_24hr === void 0 && flatpickr.defaultConfig.time_24hr === void 0) {
        self.config.time_24hr = self.l10n.time_24hr;
      }
      self.formatDate = createDateFormatter(self);
      self.parseDate = createDateParser({ config: self.config, l10n: self.l10n });
    }
    function positionCalendar(customPositionElement) {
      if (typeof self.config.position === "function") {
        return void self.config.position(self, customPositionElement);
      }
      if (self.calendarContainer === void 0)
        return;
      triggerEvent("onPreCalendarPosition");
      var positionElement = customPositionElement || self._positionElement;
      var calendarHeight = Array.prototype.reduce.call(self.calendarContainer.children, function(acc, child) {
        return acc + child.offsetHeight;
      }, 0), calendarWidth = self.calendarContainer.offsetWidth, configPos = self.config.position.split(" "), configPosVertical = configPos[0], configPosHorizontal = configPos.length > 1 ? configPos[1] : null, inputBounds = positionElement.getBoundingClientRect(), distanceFromBottom = window.innerHeight - inputBounds.bottom, showOnTop = configPosVertical === "above" || configPosVertical !== "below" && distanceFromBottom < calendarHeight && inputBounds.top > calendarHeight;
      var top = window.pageYOffset + inputBounds.top + (!showOnTop ? positionElement.offsetHeight + 2 : -calendarHeight - 2);
      toggleClass(self.calendarContainer, "arrowTop", !showOnTop);
      toggleClass(self.calendarContainer, "arrowBottom", showOnTop);
      if (self.config.inline)
        return;
      var left = window.pageXOffset + inputBounds.left;
      var isCenter = false;
      var isRight = false;
      if (configPosHorizontal === "center") {
        left -= (calendarWidth - inputBounds.width) / 2;
        isCenter = true;
      } else if (configPosHorizontal === "right") {
        left -= calendarWidth - inputBounds.width;
        isRight = true;
      }
      toggleClass(self.calendarContainer, "arrowLeft", !isCenter && !isRight);
      toggleClass(self.calendarContainer, "arrowCenter", isCenter);
      toggleClass(self.calendarContainer, "arrowRight", isRight);
      var right = window.document.body.offsetWidth - (window.pageXOffset + inputBounds.right);
      var rightMost = left + calendarWidth > window.document.body.offsetWidth;
      var centerMost = right + calendarWidth > window.document.body.offsetWidth;
      toggleClass(self.calendarContainer, "rightMost", rightMost);
      if (self.config.static)
        return;
      self.calendarContainer.style.top = top + "px";
      if (!rightMost) {
        self.calendarContainer.style.left = left + "px";
        self.calendarContainer.style.right = "auto";
      } else if (!centerMost) {
        self.calendarContainer.style.left = "auto";
        self.calendarContainer.style.right = right + "px";
      } else {
        var doc = getDocumentStyleSheet();
        if (doc === void 0)
          return;
        var bodyWidth = window.document.body.offsetWidth;
        var centerLeft = Math.max(0, bodyWidth / 2 - calendarWidth / 2);
        var centerBefore = ".flatpickr-calendar.centerMost:before";
        var centerAfter = ".flatpickr-calendar.centerMost:after";
        var centerIndex = doc.cssRules.length;
        var centerStyle = "{left:" + inputBounds.left + "px;right:auto;}";
        toggleClass(self.calendarContainer, "rightMost", false);
        toggleClass(self.calendarContainer, "centerMost", true);
        doc.insertRule(centerBefore + "," + centerAfter + centerStyle, centerIndex);
        self.calendarContainer.style.left = centerLeft + "px";
        self.calendarContainer.style.right = "auto";
      }
    }
    function getDocumentStyleSheet() {
      var editableSheet = null;
      for (var i = 0; i < document.styleSheets.length; i++) {
        var sheet = document.styleSheets[i];
        if (!sheet.cssRules)
          continue;
        try {
          sheet.cssRules;
        } catch (err) {
          continue;
        }
        editableSheet = sheet;
        break;
      }
      return editableSheet != null ? editableSheet : createStyleSheet();
    }
    function createStyleSheet() {
      var style = document.createElement("style");
      document.head.appendChild(style);
      return style.sheet;
    }
    function redraw() {
      if (self.config.noCalendar || self.isMobile)
        return;
      buildMonthSwitch();
      updateNavigationCurrentMonth();
      buildDays();
    }
    function focusAndClose() {
      self._input.focus();
      if (window.navigator.userAgent.indexOf("MSIE") !== -1 || navigator.msMaxTouchPoints !== void 0) {
        setTimeout(self.close, 0);
      } else {
        self.close();
      }
    }
    function selectDate(e) {
      e.preventDefault();
      e.stopPropagation();
      var isSelectable = function(day) {
        return day.classList && day.classList.contains("flatpickr-day") && !day.classList.contains("flatpickr-disabled") && !day.classList.contains("notAllowed");
      };
      var t = findParent(getEventTarget(e), isSelectable);
      if (t === void 0)
        return;
      var target = t;
      var selectedDate = self.latestSelectedDateObj = new Date(target.dateObj.getTime());
      var shouldChangeMonth = (selectedDate.getMonth() < self.currentMonth || selectedDate.getMonth() > self.currentMonth + self.config.showMonths - 1) && self.config.mode !== "range";
      self.selectedDateElem = target;
      if (self.config.mode === "single")
        self.selectedDates = [selectedDate];
      else if (self.config.mode === "multiple") {
        var selectedIndex = isDateSelected(selectedDate);
        if (selectedIndex)
          self.selectedDates.splice(parseInt(selectedIndex), 1);
        else
          self.selectedDates.push(selectedDate);
      } else if (self.config.mode === "range") {
        if (self.selectedDates.length === 2) {
          self.clear(false, false);
        }
        self.latestSelectedDateObj = selectedDate;
        self.selectedDates.push(selectedDate);
        if (compareDates(selectedDate, self.selectedDates[0], true) !== 0)
          self.selectedDates.sort(function(a, b) {
            return a.getTime() - b.getTime();
          });
      }
      setHoursFromInputs();
      if (shouldChangeMonth) {
        var isNewYear = self.currentYear !== selectedDate.getFullYear();
        self.currentYear = selectedDate.getFullYear();
        self.currentMonth = selectedDate.getMonth();
        if (isNewYear) {
          triggerEvent("onYearChange");
          buildMonthSwitch();
        }
        triggerEvent("onMonthChange");
      }
      updateNavigationCurrentMonth();
      buildDays();
      updateValue();
      if (!shouldChangeMonth && self.config.mode !== "range" && self.config.showMonths === 1)
        focusOnDayElem(target);
      else if (self.selectedDateElem !== void 0 && self.hourElement === void 0) {
        self.selectedDateElem && self.selectedDateElem.focus();
      }
      if (self.hourElement !== void 0)
        self.hourElement !== void 0 && self.hourElement.focus();
      if (self.config.closeOnSelect) {
        var single = self.config.mode === "single" && !self.config.enableTime;
        var range = self.config.mode === "range" && self.selectedDates.length === 2 && !self.config.enableTime;
        if (single || range) {
          focusAndClose();
        }
      }
      triggerChange();
    }
    var CALLBACKS = {
      locale: [setupLocale, updateWeekdays],
      showMonths: [buildMonths, setCalendarWidth, buildWeekdays],
      minDate: [jumpToDate],
      maxDate: [jumpToDate],
      positionElement: [updatePositionElement],
      clickOpens: [
        function() {
          if (self.config.clickOpens === true) {
            bind(self._input, "focus", self.open);
            bind(self._input, "click", self.open);
          } else {
            self._input.removeEventListener("focus", self.open);
            self._input.removeEventListener("click", self.open);
          }
        }
      ]
    };
    function set(option, value) {
      if (option !== null && typeof option === "object") {
        Object.assign(self.config, option);
        for (var key in option) {
          if (CALLBACKS[key] !== void 0)
            CALLBACKS[key].forEach(function(x) {
              return x();
            });
        }
      } else {
        self.config[option] = value;
        if (CALLBACKS[option] !== void 0)
          CALLBACKS[option].forEach(function(x) {
            return x();
          });
        else if (HOOKS.indexOf(option) > -1)
          self.config[option] = arrayify(value);
      }
      self.redraw();
      updateValue(true);
    }
    function setSelectedDate(inputDate, format) {
      var dates = [];
      if (inputDate instanceof Array)
        dates = inputDate.map(function(d) {
          return self.parseDate(d, format);
        });
      else if (inputDate instanceof Date || typeof inputDate === "number")
        dates = [self.parseDate(inputDate, format)];
      else if (typeof inputDate === "string") {
        switch (self.config.mode) {
          case "single":
          case "time":
            dates = [self.parseDate(inputDate, format)];
            break;
          case "multiple":
            dates = inputDate.split(self.config.conjunction).map(function(date) {
              return self.parseDate(date, format);
            });
            break;
          case "range":
            dates = inputDate.split(self.l10n.rangeSeparator).map(function(date) {
              return self.parseDate(date, format);
            });
            break;
          default:
            break;
        }
      } else
        self.config.errorHandler(new Error("Invalid date supplied: " + JSON.stringify(inputDate)));
      self.selectedDates = self.config.allowInvalidPreload ? dates : dates.filter(function(d) {
        return d instanceof Date && isEnabled(d, false);
      });
      if (self.config.mode === "range")
        self.selectedDates.sort(function(a, b) {
          return a.getTime() - b.getTime();
        });
    }
    function setDate(date, triggerChange2, format) {
      if (triggerChange2 === void 0) {
        triggerChange2 = false;
      }
      if (format === void 0) {
        format = self.config.dateFormat;
      }
      if (date !== 0 && !date || date instanceof Array && date.length === 0)
        return self.clear(triggerChange2);
      setSelectedDate(date, format);
      self.latestSelectedDateObj = self.selectedDates[self.selectedDates.length - 1];
      self.redraw();
      jumpToDate(void 0, triggerChange2);
      setHoursFromDate();
      if (self.selectedDates.length === 0) {
        self.clear(false);
      }
      updateValue(triggerChange2);
      if (triggerChange2)
        triggerEvent("onChange");
    }
    function parseDateRules(arr) {
      return arr.slice().map(function(rule) {
        if (typeof rule === "string" || typeof rule === "number" || rule instanceof Date) {
          return self.parseDate(rule, void 0, true);
        } else if (rule && typeof rule === "object" && rule.from && rule.to)
          return {
            from: self.parseDate(rule.from, void 0),
            to: self.parseDate(rule.to, void 0)
          };
        return rule;
      }).filter(function(x) {
        return x;
      });
    }
    function setupDates() {
      self.selectedDates = [];
      self.now = self.parseDate(self.config.now) || /* @__PURE__ */ new Date();
      var preloadedDate = self.config.defaultDate || ((self.input.nodeName === "INPUT" || self.input.nodeName === "TEXTAREA") && self.input.placeholder && self.input.value === self.input.placeholder ? null : self.input.value);
      if (preloadedDate)
        setSelectedDate(preloadedDate, self.config.dateFormat);
      self._initialDate = self.selectedDates.length > 0 ? self.selectedDates[0] : self.config.minDate && self.config.minDate.getTime() > self.now.getTime() ? self.config.minDate : self.config.maxDate && self.config.maxDate.getTime() < self.now.getTime() ? self.config.maxDate : self.now;
      self.currentYear = self._initialDate.getFullYear();
      self.currentMonth = self._initialDate.getMonth();
      if (self.selectedDates.length > 0)
        self.latestSelectedDateObj = self.selectedDates[0];
      if (self.config.minTime !== void 0)
        self.config.minTime = self.parseDate(self.config.minTime, "H:i");
      if (self.config.maxTime !== void 0)
        self.config.maxTime = self.parseDate(self.config.maxTime, "H:i");
      self.minDateHasTime = !!self.config.minDate && (self.config.minDate.getHours() > 0 || self.config.minDate.getMinutes() > 0 || self.config.minDate.getSeconds() > 0);
      self.maxDateHasTime = !!self.config.maxDate && (self.config.maxDate.getHours() > 0 || self.config.maxDate.getMinutes() > 0 || self.config.maxDate.getSeconds() > 0);
    }
    function setupInputs() {
      self.input = getInputElem();
      if (!self.input) {
        self.config.errorHandler(new Error("Invalid input element specified"));
        return;
      }
      self.input._type = self.input.type;
      self.input.type = "text";
      self.input.classList.add("flatpickr-input");
      self._input = self.input;
      if (self.config.altInput) {
        self.altInput = createElement(self.input.nodeName, self.config.altInputClass);
        self._input = self.altInput;
        self.altInput.placeholder = self.input.placeholder;
        self.altInput.disabled = self.input.disabled;
        self.altInput.required = self.input.required;
        self.altInput.tabIndex = self.input.tabIndex;
        self.altInput.type = "text";
        self.input.setAttribute("type", "hidden");
        if (!self.config.static && self.input.parentNode)
          self.input.parentNode.insertBefore(self.altInput, self.input.nextSibling);
      }
      if (!self.config.allowInput)
        self._input.setAttribute("readonly", "readonly");
      updatePositionElement();
    }
    function updatePositionElement() {
      self._positionElement = self.config.positionElement || self._input;
    }
    function setupMobile() {
      var inputType = self.config.enableTime ? self.config.noCalendar ? "time" : "datetime-local" : "date";
      self.mobileInput = createElement("input", self.input.className + " flatpickr-mobile");
      self.mobileInput.tabIndex = 1;
      self.mobileInput.type = inputType;
      self.mobileInput.disabled = self.input.disabled;
      self.mobileInput.required = self.input.required;
      self.mobileInput.placeholder = self.input.placeholder;
      self.mobileFormatStr = inputType === "datetime-local" ? "Y-m-d\\TH:i:S" : inputType === "date" ? "Y-m-d" : "H:i:S";
      if (self.selectedDates.length > 0) {
        self.mobileInput.defaultValue = self.mobileInput.value = self.formatDate(self.selectedDates[0], self.mobileFormatStr);
      }
      if (self.config.minDate)
        self.mobileInput.min = self.formatDate(self.config.minDate, "Y-m-d");
      if (self.config.maxDate)
        self.mobileInput.max = self.formatDate(self.config.maxDate, "Y-m-d");
      if (self.input.getAttribute("step"))
        self.mobileInput.step = String(self.input.getAttribute("step"));
      self.input.type = "hidden";
      if (self.altInput !== void 0)
        self.altInput.type = "hidden";
      try {
        if (self.input.parentNode)
          self.input.parentNode.insertBefore(self.mobileInput, self.input.nextSibling);
      } catch (_a) {
      }
      bind(self.mobileInput, "change", function(e) {
        self.setDate(getEventTarget(e).value, false, self.mobileFormatStr);
        triggerEvent("onChange");
        triggerEvent("onClose");
      });
    }
    function toggle(e) {
      if (self.isOpen === true)
        return self.close();
      self.open(e);
    }
    function triggerEvent(event, data) {
      if (self.config === void 0)
        return;
      var hooks = self.config[event];
      if (hooks !== void 0 && hooks.length > 0) {
        for (var i = 0; hooks[i] && i < hooks.length; i++)
          hooks[i](self.selectedDates, self.input.value, self, data);
      }
      if (event === "onChange") {
        self.input.dispatchEvent(createEvent("change"));
        self.input.dispatchEvent(createEvent("input"));
      }
    }
    function createEvent(name) {
      var e = document.createEvent("Event");
      e.initEvent(name, true, true);
      return e;
    }
    function isDateSelected(date) {
      for (var i = 0; i < self.selectedDates.length; i++) {
        var selectedDate = self.selectedDates[i];
        if (selectedDate instanceof Date && compareDates(selectedDate, date) === 0)
          return "" + i;
      }
      return false;
    }
    function isDateInRange(date) {
      if (self.config.mode !== "range" || self.selectedDates.length < 2)
        return false;
      return compareDates(date, self.selectedDates[0]) >= 0 && compareDates(date, self.selectedDates[1]) <= 0;
    }
    function updateNavigationCurrentMonth() {
      if (self.config.noCalendar || self.isMobile || !self.monthNav)
        return;
      self.yearElements.forEach(function(yearElement, i) {
        var d = new Date(self.currentYear, self.currentMonth, 1);
        d.setMonth(self.currentMonth + i);
        if (self.config.showMonths > 1 || self.config.monthSelectorType === "static") {
          self.monthElements[i].textContent = monthToStr(d.getMonth(), self.config.shorthandCurrentMonth, self.l10n) + " ";
        } else {
          self.monthsDropdownContainer.value = d.getMonth().toString();
        }
        yearElement.value = d.getFullYear().toString();
      });
      self._hidePrevMonthArrow = self.config.minDate !== void 0 && (self.currentYear === self.config.minDate.getFullYear() ? self.currentMonth <= self.config.minDate.getMonth() : self.currentYear < self.config.minDate.getFullYear());
      self._hideNextMonthArrow = self.config.maxDate !== void 0 && (self.currentYear === self.config.maxDate.getFullYear() ? self.currentMonth + 1 > self.config.maxDate.getMonth() : self.currentYear > self.config.maxDate.getFullYear());
    }
    function getDateStr(specificFormat) {
      var format = specificFormat || (self.config.altInput ? self.config.altFormat : self.config.dateFormat);
      return self.selectedDates.map(function(dObj) {
        return self.formatDate(dObj, format);
      }).filter(function(d, i, arr) {
        return self.config.mode !== "range" || self.config.enableTime || arr.indexOf(d) === i;
      }).join(self.config.mode !== "range" ? self.config.conjunction : self.l10n.rangeSeparator);
    }
    function updateValue(triggerChange2) {
      if (triggerChange2 === void 0) {
        triggerChange2 = true;
      }
      if (self.mobileInput !== void 0 && self.mobileFormatStr) {
        self.mobileInput.value = self.latestSelectedDateObj !== void 0 ? self.formatDate(self.latestSelectedDateObj, self.mobileFormatStr) : "";
      }
      self.input.value = getDateStr(self.config.dateFormat);
      if (self.altInput !== void 0) {
        self.altInput.value = getDateStr(self.config.altFormat);
      }
      if (triggerChange2 !== false)
        triggerEvent("onValueUpdate");
    }
    function onMonthNavClick(e) {
      var eventTarget = getEventTarget(e);
      var isPrevMonth = self.prevMonthNav.contains(eventTarget);
      var isNextMonth = self.nextMonthNav.contains(eventTarget);
      if (isPrevMonth || isNextMonth) {
        changeMonth(isPrevMonth ? -1 : 1);
      } else if (self.yearElements.indexOf(eventTarget) >= 0) {
        eventTarget.select();
      } else if (eventTarget.classList.contains("arrowUp")) {
        self.changeYear(self.currentYear + 1);
      } else if (eventTarget.classList.contains("arrowDown")) {
        self.changeYear(self.currentYear - 1);
      }
    }
    function timeWrapper(e) {
      e.preventDefault();
      var isKeyDown = e.type === "keydown", eventTarget = getEventTarget(e), input = eventTarget;
      if (self.amPM !== void 0 && eventTarget === self.amPM) {
        self.amPM.textContent = self.l10n.amPM[int(self.amPM.textContent === self.l10n.amPM[0])];
      }
      var min = parseFloat(input.getAttribute("min")), max = parseFloat(input.getAttribute("max")), step = parseFloat(input.getAttribute("step")), curValue = parseInt(input.value, 10), delta = e.delta || (isKeyDown ? e.which === 38 ? 1 : -1 : 0);
      var newValue = curValue + step * delta;
      if (typeof input.value !== "undefined" && input.value.length === 2) {
        var isHourElem = input === self.hourElement, isMinuteElem = input === self.minuteElement;
        if (newValue < min) {
          newValue = max + newValue + int(!isHourElem) + (int(isHourElem) && int(!self.amPM));
          if (isMinuteElem)
            incrementNumInput(void 0, -1, self.hourElement);
        } else if (newValue > max) {
          newValue = input === self.hourElement ? newValue - max - int(!self.amPM) : min;
          if (isMinuteElem)
            incrementNumInput(void 0, 1, self.hourElement);
        }
        if (self.amPM && isHourElem && (step === 1 ? newValue + curValue === 23 : Math.abs(newValue - curValue) > step)) {
          self.amPM.textContent = self.l10n.amPM[int(self.amPM.textContent === self.l10n.amPM[0])];
        }
        input.value = pad(newValue);
      }
    }
    init();
    return self;
  }
  function _flatpickr(nodeList, config) {
    var nodes = Array.prototype.slice.call(nodeList).filter(function(x) {
      return x instanceof HTMLElement;
    });
    var instances = [];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      try {
        if (node.getAttribute("data-fp-omit") !== null)
          continue;
        if (node._flatpickr !== void 0) {
          node._flatpickr.destroy();
          node._flatpickr = void 0;
        }
        node._flatpickr = FlatpickrInstance(node, config || {});
        instances.push(node._flatpickr);
      } catch (e) {
        console.error(e);
      }
    }
    return instances.length === 1 ? instances[0] : instances;
  }
  if (typeof HTMLElement !== "undefined" && typeof HTMLCollection !== "undefined" && typeof NodeList !== "undefined") {
    HTMLCollection.prototype.flatpickr = NodeList.prototype.flatpickr = function(config) {
      return _flatpickr(this, config);
    };
    HTMLElement.prototype.flatpickr = function(config) {
      return _flatpickr([this], config);
    };
  }
  var flatpickr = function(selector, config) {
    if (typeof selector === "string") {
      return _flatpickr(window.document.querySelectorAll(selector), config);
    } else if (selector instanceof Node) {
      return _flatpickr([selector], config);
    } else {
      return _flatpickr(selector, config);
    }
  };
  flatpickr.defaultConfig = {};
  flatpickr.l10ns = {
    en: __assign({}, default_default),
    default: __assign({}, default_default)
  };
  flatpickr.localize = function(l10n) {
    flatpickr.l10ns.default = __assign(__assign({}, flatpickr.l10ns.default), l10n);
  };
  flatpickr.setDefaults = function(config) {
    flatpickr.defaultConfig = __assign(__assign({}, flatpickr.defaultConfig), config);
  };
  flatpickr.parseDate = createDateParser({});
  flatpickr.formatDate = createDateFormatter({});
  flatpickr.compareDates = compareDates;
  if (typeof jQuery !== "undefined" && typeof jQuery.fn !== "undefined") {
    jQuery.fn.flatpickr = function(config) {
      return _flatpickr(this, config);
    };
  }
  Date.prototype.fp_incr = function(days) {
    return new Date(this.getFullYear(), this.getMonth(), this.getDate() + (typeof days === "string" ? parseInt(days, 10) : days));
  };
  if (typeof window !== "undefined") {
    window.flatpickr = flatpickr;
  }
  var esm_default = flatpickr;

  // src/styles/flatpickr-css.js
  var flatpickrCss = `.flatpickr-calendar{background:transparent;opacity:0;display:none;text-align:center;visibility:hidden;padding:0;-webkit-animation:none;animation:none;direction:ltr;border:0;font-size:14px;line-height:24px;border-radius:5px;position:absolute;width:307.875px;-webkit-box-sizing:border-box;box-sizing:border-box;-ms-touch-action:manipulation;touch-action:manipulation;background:#fff;-webkit-box-shadow:1px 0 0 #e6e6e6,-1px 0 0 #e6e6e6,0 1px 0 #e6e6e6,0 -1px 0 #e6e6e6,0 3px 13px rgba(0,0,0,0.08);box-shadow:1px 0 0 #e6e6e6,-1px 0 0 #e6e6e6,0 1px 0 #e6e6e6,0 -1px 0 #e6e6e6,0 3px 13px rgba(0,0,0,0.08)}.flatpickr-calendar.open,.flatpickr-calendar.inline{opacity:1;max-height:640px;visibility:visible}.flatpickr-calendar.open{display:inline-block;z-index:99999}.flatpickr-calendar.animate.open{-webkit-animation:fpFadeInDown 300ms cubic-bezier(.23,1,.32,1);animation:fpFadeInDown 300ms cubic-bezier(.23,1,.32,1)}.flatpickr-calendar.inline{display:block;position:relative;top:2px}.flatpickr-calendar.static{position:absolute;top:calc(100% + 2px)}.flatpickr-calendar.static.open{z-index:999;display:block}.flatpickr-calendar.multiMonth .flatpickr-days .dayContainer:nth-child(n+1) .flatpickr-day.inRange:nth-child(7n+7){-webkit-box-shadow:none !important;box-shadow:none !important}.flatpickr-calendar.multiMonth .flatpickr-days .dayContainer:nth-child(n+2) .flatpickr-day.inRange:nth-child(7n+1){-webkit-box-shadow:-2px 0 0 #e6e6e6,5px 0 0 #e6e6e6;box-shadow:-2px 0 0 #e6e6e6,5px 0 0 #e6e6e6}.flatpickr-calendar .hasWeeks .dayContainer,.flatpickr-calendar .hasTime .dayContainer{border-bottom:0;border-bottom-right-radius:0;border-bottom-left-radius:0}.flatpickr-calendar .hasWeeks .dayContainer{border-left:0}.flatpickr-calendar.hasTime .flatpickr-time{height:40px;border-top:1px solid #e6e6e6}.flatpickr-calendar.noCalendar.hasTime .flatpickr-time{height:auto}.flatpickr-calendar:before,.flatpickr-calendar:after{position:absolute;display:block;pointer-events:none;border:solid transparent;content:'';height:0;width:0;left:22px}.flatpickr-calendar.rightMost:before,.flatpickr-calendar.arrowRight:before,.flatpickr-calendar.rightMost:after,.flatpickr-calendar.arrowRight:after{left:auto;right:22px}.flatpickr-calendar.arrowCenter:before,.flatpickr-calendar.arrowCenter:after{left:50%;right:50%}.flatpickr-calendar:before{border-width:5px;margin:0 -5px}.flatpickr-calendar:after{border-width:4px;margin:0 -4px}.flatpickr-calendar.arrowTop:before,.flatpickr-calendar.arrowTop:after{bottom:100%}.flatpickr-calendar.arrowTop:before{border-bottom-color:#e6e6e6}.flatpickr-calendar.arrowTop:after{border-bottom-color:#fff}.flatpickr-calendar.arrowBottom:before,.flatpickr-calendar.arrowBottom:after{top:100%}.flatpickr-calendar.arrowBottom:before{border-top-color:#e6e6e6}.flatpickr-calendar.arrowBottom:after{border-top-color:#fff}.flatpickr-calendar:focus{outline:0}.flatpickr-wrapper{position:relative;display:inline-block}.flatpickr-months{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex}.flatpickr-months .flatpickr-month{background:transparent;color:rgba(0,0,0,0.9);fill:rgba(0,0,0,0.9);height:34px;line-height:1;text-align:center;position:relative;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;overflow:hidden;-webkit-box-flex:1;-webkit-flex:1;-ms-flex:1;flex:1}.flatpickr-months .flatpickr-prev-month,.flatpickr-months .flatpickr-next-month{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;text-decoration:none;cursor:pointer;position:absolute;top:0;height:34px;padding:10px;z-index:3;color:rgba(0,0,0,0.9);fill:rgba(0,0,0,0.9)}.flatpickr-months .flatpickr-prev-month.flatpickr-disabled,.flatpickr-months .flatpickr-next-month.flatpickr-disabled{display:none}.flatpickr-months .flatpickr-prev-month i,.flatpickr-months .flatpickr-next-month i{position:relative}.flatpickr-months .flatpickr-prev-month.flatpickr-prev-month,.flatpickr-months .flatpickr-next-month.flatpickr-prev-month{/*rtl:begin:ignore*/left:0/*rtl:end:ignore*/}/*rtl:begin:ignore*//*rtl:end:ignore*/.flatpickr-months .flatpickr-prev-month.flatpickr-next-month,.flatpickr-months .flatpickr-next-month.flatpickr-next-month{/*rtl:begin:ignore*/right:0/*rtl:end:ignore*/}/*rtl:begin:ignore*//*rtl:end:ignore*/.flatpickr-months .flatpickr-prev-month:hover,.flatpickr-months .flatpickr-next-month:hover{color:#959ea9}.flatpickr-months .flatpickr-prev-month:hover svg,.flatpickr-months .flatpickr-next-month:hover svg{fill:#f64747}.flatpickr-months .flatpickr-prev-month svg,.flatpickr-months .flatpickr-next-month svg{width:14px;height:14px}.flatpickr-months .flatpickr-prev-month svg path,.flatpickr-months .flatpickr-next-month svg path{-webkit-transition:fill .1s;transition:fill .1s;fill:inherit}.numInputWrapper{position:relative;height:auto}.numInputWrapper input,.numInputWrapper span{display:inline-block}.numInputWrapper input{width:100%}.numInputWrapper input::-ms-clear{display:none}.numInputWrapper input::-webkit-outer-spin-button,.numInputWrapper input::-webkit-inner-spin-button{margin:0;-webkit-appearance:none}.numInputWrapper span{position:absolute;right:0;width:14px;padding:0 4px 0 2px;height:50%;line-height:50%;opacity:0;cursor:pointer;border:1px solid rgba(57,57,57,0.15);-webkit-box-sizing:border-box;box-sizing:border-box}.numInputWrapper span:hover{background:rgba(0,0,0,0.1)}.numInputWrapper span:active{background:rgba(0,0,0,0.2)}.numInputWrapper span:after{display:block;content:"";position:absolute}.numInputWrapper span.arrowUp{top:0;border-bottom:0}.numInputWrapper span.arrowUp:after{border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:4px solid rgba(57,57,57,0.6);top:26%}.numInputWrapper span.arrowDown{top:50%}.numInputWrapper span.arrowDown:after{border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid rgba(57,57,57,0.6);top:40%}.numInputWrapper span svg{width:inherit;height:auto}.numInputWrapper span svg path{fill:rgba(0,0,0,0.5)}.numInputWrapper:hover{background:rgba(0,0,0,0.05)}.numInputWrapper:hover span{opacity:1}.flatpickr-current-month{font-size:135%;line-height:inherit;font-weight:300;color:inherit;position:absolute;width:75%;left:12.5%;padding:7.48px 0 0 0;line-height:1;height:34px;display:inline-block;text-align:center;-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}.flatpickr-current-month span.cur-month{font-family:inherit;font-weight:700;color:inherit;display:inline-block;margin-left:.5ch;padding:0}.flatpickr-current-month span.cur-month:hover{background:rgba(0,0,0,0.05)}.flatpickr-current-month .numInputWrapper{width:6ch;width:7ch\\0;display:inline-block}.flatpickr-current-month .numInputWrapper span.arrowUp:after{border-bottom-color:rgba(0,0,0,0.9)}.flatpickr-current-month .numInputWrapper span.arrowDown:after{border-top-color:rgba(0,0,0,0.9)}.flatpickr-current-month input.cur-year{background:transparent;-webkit-box-sizing:border-box;box-sizing:border-box;color:inherit;cursor:text;padding:0 0 0 .5ch;margin:0;display:inline-block;font-size:inherit;font-family:inherit;font-weight:300;line-height:inherit;height:auto;border:0;border-radius:0;vertical-align:initial;-webkit-appearance:textfield;-moz-appearance:textfield;appearance:textfield}.flatpickr-current-month input.cur-year:focus{outline:0}.flatpickr-current-month input.cur-year[disabled],.flatpickr-current-month input.cur-year[disabled]:hover{font-size:100%;color:rgba(0,0,0,0.5);background:transparent;pointer-events:none}.flatpickr-current-month .flatpickr-monthDropdown-months{appearance:menulist;background:transparent;border:none;border-radius:0;box-sizing:border-box;color:inherit;cursor:pointer;font-size:inherit;font-family:inherit;font-weight:300;height:auto;line-height:inherit;margin:-1px 0 0 0;outline:none;padding:0 0 0 .5ch;position:relative;vertical-align:initial;-webkit-box-sizing:border-box;-webkit-appearance:menulist;-moz-appearance:menulist;width:auto}.flatpickr-current-month .flatpickr-monthDropdown-months:focus,.flatpickr-current-month .flatpickr-monthDropdown-months:active{outline:none}.flatpickr-current-month .flatpickr-monthDropdown-months:hover{background:rgba(0,0,0,0.05)}.flatpickr-current-month .flatpickr-monthDropdown-months .flatpickr-monthDropdown-month{background-color:transparent;outline:none;padding:0}.flatpickr-weekdays{background:transparent;text-align:center;overflow:hidden;width:100%;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;height:28px}.flatpickr-weekdays .flatpickr-weekdaycontainer{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-flex:1;-webkit-flex:1;-ms-flex:1;flex:1}span.flatpickr-weekday{cursor:default;font-size:90%;background:transparent;color:rgba(0,0,0,0.54);line-height:1;margin:0;text-align:center;display:block;-webkit-box-flex:1;-webkit-flex:1;-ms-flex:1;flex:1;font-weight:bolder}.dayContainer,.flatpickr-weeks{padding:1px 0 0 0}.flatpickr-days{position:relative;overflow:hidden;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:start;-webkit-align-items:flex-start;-ms-flex-align:start;align-items:flex-start;width:307.875px}.flatpickr-days:focus{outline:0}.dayContainer{padding:0;outline:0;text-align:left;width:307.875px;min-width:307.875px;max-width:307.875px;-webkit-box-sizing:border-box;box-sizing:border-box;display:inline-block;display:-ms-flexbox;display:-webkit-box;display:-webkit-flex;display:flex;-webkit-flex-wrap:wrap;flex-wrap:wrap;-ms-flex-wrap:wrap;-ms-flex-pack:justify;-webkit-justify-content:space-around;justify-content:space-around;-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}.dayContainer + .dayContainer{-webkit-box-shadow:-1px 0 0 #e6e6e6;box-shadow:-1px 0 0 #e6e6e6}.flatpickr-day{background:none;border:1px solid transparent;border-radius:150px;-webkit-box-sizing:border-box;box-sizing:border-box;color:#393939;cursor:pointer;font-weight:400;width:14.2857143%;-webkit-flex-basis:14.2857143%;-ms-flex-preferred-size:14.2857143%;flex-basis:14.2857143%;max-width:39px;height:39px;line-height:39px;margin:0;display:inline-block;position:relative;-webkit-box-pack:center;-webkit-justify-content:center;-ms-flex-pack:center;justify-content:center;text-align:center}.flatpickr-day.inRange,.flatpickr-day.prevMonthDay.inRange,.flatpickr-day.nextMonthDay.inRange,.flatpickr-day.today.inRange,.flatpickr-day.prevMonthDay.today.inRange,.flatpickr-day.nextMonthDay.today.inRange,.flatpickr-day:hover,.flatpickr-day.prevMonthDay:hover,.flatpickr-day.nextMonthDay:hover,.flatpickr-day:focus,.flatpickr-day.prevMonthDay:focus,.flatpickr-day.nextMonthDay:focus{cursor:pointer;outline:0;background:#e6e6e6;border-color:#e6e6e6}.flatpickr-day.today{border-color:#959ea9}.flatpickr-day.today:hover,.flatpickr-day.today:focus{border-color:#959ea9;background:#959ea9;color:#fff}.flatpickr-day.selected,.flatpickr-day.startRange,.flatpickr-day.endRange,.flatpickr-day.selected.inRange,.flatpickr-day.startRange.inRange,.flatpickr-day.endRange.inRange,.flatpickr-day.selected:focus,.flatpickr-day.startRange:focus,.flatpickr-day.endRange:focus,.flatpickr-day.selected:hover,.flatpickr-day.startRange:hover,.flatpickr-day.endRange:hover,.flatpickr-day.selected.prevMonthDay,.flatpickr-day.startRange.prevMonthDay,.flatpickr-day.endRange.prevMonthDay,.flatpickr-day.selected.nextMonthDay,.flatpickr-day.startRange.nextMonthDay,.flatpickr-day.endRange.nextMonthDay{background:#569ff7;-webkit-box-shadow:none;box-shadow:none;color:#fff;border-color:#569ff7}.flatpickr-day.selected.startRange,.flatpickr-day.startRange.startRange,.flatpickr-day.endRange.startRange{border-radius:50px 0 0 50px}.flatpickr-day.selected.endRange,.flatpickr-day.startRange.endRange,.flatpickr-day.endRange.endRange{border-radius:0 50px 50px 0}.flatpickr-day.selected.startRange + .endRange:not(:nth-child(7n+1)),.flatpickr-day.startRange.startRange + .endRange:not(:nth-child(7n+1)),.flatpickr-day.endRange.startRange + .endRange:not(:nth-child(7n+1)){-webkit-box-shadow:-10px 0 0 #569ff7;box-shadow:-10px 0 0 #569ff7}.flatpickr-day.selected.startRange.endRange,.flatpickr-day.startRange.startRange.endRange,.flatpickr-day.endRange.startRange.endRange{border-radius:50px}.flatpickr-day.inRange{border-radius:0;-webkit-box-shadow:-5px 0 0 #e6e6e6,5px 0 0 #e6e6e6;box-shadow:-5px 0 0 #e6e6e6,5px 0 0 #e6e6e6}.flatpickr-day.flatpickr-disabled,.flatpickr-day.flatpickr-disabled:hover,.flatpickr-day.prevMonthDay,.flatpickr-day.nextMonthDay,.flatpickr-day.notAllowed,.flatpickr-day.notAllowed.prevMonthDay,.flatpickr-day.notAllowed.nextMonthDay{color:rgba(57,57,57,0.3);background:transparent;border-color:transparent;cursor:default}.flatpickr-day.flatpickr-disabled,.flatpickr-day.flatpickr-disabled:hover{cursor:not-allowed;color:rgba(57,57,57,0.1)}.flatpickr-day.week.selected{border-radius:0;-webkit-box-shadow:-5px 0 0 #569ff7,5px 0 0 #569ff7;box-shadow:-5px 0 0 #569ff7,5px 0 0 #569ff7}.flatpickr-day.hidden{visibility:hidden}.rangeMode .flatpickr-day{margin-top:1px}.flatpickr-weekwrapper{float:left}.flatpickr-weekwrapper .flatpickr-weeks{padding:0 12px;-webkit-box-shadow:1px 0 0 #e6e6e6;box-shadow:1px 0 0 #e6e6e6}.flatpickr-weekwrapper .flatpickr-weekday{float:none;width:100%;line-height:28px}.flatpickr-weekwrapper span.flatpickr-day,.flatpickr-weekwrapper span.flatpickr-day:hover{display:block;width:100%;max-width:none;color:rgba(57,57,57,0.3);background:transparent;cursor:default;border:none}.flatpickr-innerContainer{display:block;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-sizing:border-box;box-sizing:border-box;overflow:hidden}.flatpickr-rContainer{display:inline-block;padding:0;-webkit-box-sizing:border-box;box-sizing:border-box}.flatpickr-time{text-align:center;outline:0;display:block;height:0;line-height:40px;max-height:40px;-webkit-box-sizing:border-box;box-sizing:border-box;overflow:hidden;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex}.flatpickr-time:after{content:"";display:table;clear:both}.flatpickr-time .numInputWrapper{-webkit-box-flex:1;-webkit-flex:1;-ms-flex:1;flex:1;width:40%;height:40px;float:left}.flatpickr-time .numInputWrapper span.arrowUp:after{border-bottom-color:#393939}.flatpickr-time .numInputWrapper span.arrowDown:after{border-top-color:#393939}.flatpickr-time.hasSeconds .numInputWrapper{width:26%}.flatpickr-time.time24hr .numInputWrapper{width:49%}.flatpickr-time input{background:transparent;-webkit-box-shadow:none;box-shadow:none;border:0;border-radius:0;text-align:center;margin:0;padding:0;height:inherit;line-height:inherit;color:#393939;font-size:14px;position:relative;-webkit-box-sizing:border-box;box-sizing:border-box;-webkit-appearance:textfield;-moz-appearance:textfield;appearance:textfield}.flatpickr-time input.flatpickr-hour{font-weight:bold}.flatpickr-time input.flatpickr-minute,.flatpickr-time input.flatpickr-second{font-weight:400}.flatpickr-time input:focus{outline:0;border:0}.flatpickr-time .flatpickr-time-separator,.flatpickr-time .flatpickr-am-pm{height:inherit;float:left;line-height:inherit;color:#393939;font-weight:bold;width:2%;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-align-self:center;-ms-flex-item-align:center;align-self:center}.flatpickr-time .flatpickr-am-pm{outline:0;width:18%;cursor:pointer;text-align:center;font-weight:400}.flatpickr-time input:hover,.flatpickr-time .flatpickr-am-pm:hover,.flatpickr-time input:focus,.flatpickr-time .flatpickr-am-pm:focus{background:#eee}.flatpickr-input[readonly]{cursor:pointer}@-webkit-keyframes fpFadeInDown{from{opacity:0;-webkit-transform:translate3d(0,-20px,0);transform:translate3d(0,-20px,0)}to{opacity:1;-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}@keyframes fpFadeInDown{from{opacity:0;-webkit-transform:translate3d(0,-20px,0);transform:translate3d(0,-20px,0)}to{opacity:1;-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}`;

  // src/features/date-picker.js
  var flatpickrOverrides = `
.flatpickr-months .flatpickr-month{color:#002d28}
.flatpickr-current-month{color:#002d28;width:auto;left:50%;transform:translateX(-50%)}
.flatpickr-current-month input.cur-year{color:#002d28;display:none}
.flatpickr-current-month .flatpickr-monthDropdown-months{color:#002d28}
.flatpickr-current-month .flatpickr-monthDropdown-months .flatpickr-monthDropdown-month:hover{background:#39f2af}
.flatpickr-day{color:#002d28}
span.flatpickr-weekday{color:#002d28}
.flatpickr-calendar{border-radius:0}
.flatpickr-day.selected,.flatpickr-day.startRange,.flatpickr-day.endRange,.flatpickr-day.selected.inRange,.flatpickr-day.startRange.inRange,.flatpickr-day.endRange.inRange,.flatpickr-day.selected:focus,.flatpickr-day.startRange:focus,.flatpickr-day.endRange:focus,.flatpickr-day.selected:hover,.flatpickr-day.startRange:hover,.flatpickr-day.endRange:hover,.flatpickr-day.selected.prevMonthDay,.flatpickr-day.startRange.prevMonthDay,.flatpickr-day.endRange.prevMonthDay,.flatpickr-day.selected.nextMonthDay,.flatpickr-day.startRange.nextMonthDay,.flatpickr-day.endRange.nextMonthDay{border-radius:0;background:#39f2af;color:#002d28;border-color:#39f2af;--corner-size:8px;clip-path:polygon(0 0,calc(100% - var(--corner-size)) 0,100% var(--corner-size),100% 100%,var(--corner-size) 100%,0 calc(100% - var(--corner-size)))}
`;
  function injectFlatpickrCss() {
    if (document.getElementById("flatpickr-css")) return;
    const style = document.createElement("style");
    style.id = "flatpickr-css";
    style.textContent = flatpickrCss + flatpickrOverrides;
    document.head.appendChild(style);
  }
  function initDatePicker() {
    injectFlatpickrCss();
    const dateInputs = document.querySelectorAll("[data-date-input]");
    dateInputs.forEach((input) => {
      input.style.cursor = "pointer";
      esm_default(input, {
        // Display the date as dd-MM-yyyy in the field.
        dateFormat: "d-m-Y",
        // Earliest selectable date is today (local timezone).
        minDate: "today",
        // The user cannot type a date manually.
        allowInput: false,
        // Clicking the input opens the calendar.
        clickOpens: true,
        // Use the custom picker on mobile too (consistent behavior).
        disableMobile: true,
        // Store the yyyy-MM-dd value for the URL.
        onChange: (selectedDates) => {
          if (selectedDates.length === 0) return;
          input.dataset.dateIso = toISODate(selectedDates[0]);
          input.dataset.isValid = "true";
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });
  }
  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // src/features/location-autocomplete.js
  async function initLocationAutocomplete() {
    const locationInputs = document.querySelectorAll("[data-location-input]");
    if (locationInputs.length === 0) return;
    const config = window.RateModuleConfig || {};
    const language = typeof config.language === "string" ? config.language : void 0;
    const regionCode = typeof config.regionCode === "string" ? config.regionCode : void 0;
    const includedRegionCodes = Array.isArray(config.includedRegionCodes) ? config.includedRegionCodes.filter((c) => typeof c === "string") : void 0;
    const maxSuggestions = Number.isInteger(config.maxSuggestions) && config.maxSuggestions > 0 ? config.maxSuggestions : 5;
    let AutocompleteSuggestion, Place;
    try {
      const placesLib = await google.maps.importLibrary("places");
      AutocompleteSuggestion = placesLib.AutocompleteSuggestion;
      Place = placesLib.Place;
    } catch (err) {
      console.error("Failed to initialize Google Places Autocomplete:", err);
      return;
    }
    locationInputs.forEach((input) => {
      initLocationField(
        input,
        AutocompleteSuggestion,
        Place,
        language,
        regionCode,
        includedRegionCodes,
        maxSuggestions
      );
    });
    function initLocationField(input, AutocompleteSuggestion2, Place2, language2, regionCode2, includedRegionCodes2, maxSuggestions2) {
      const fieldContainer = input.closest("[data-location-field]");
      if (!fieldContainer) return;
      const dropdownList = fieldContainer.querySelector("[data-location-list]");
      const templateItem = dropdownList ? dropdownList.querySelector("[data-location-item]") : null;
      if (!dropdownList || !templateItem) return;
      const templateClone = templateItem.cloneNode(true);
      dropdownList.innerHTML = "";
      dropdownList.classList.remove("show");
      dropdownList.style.display = "none";
      let debounceTimer = null;
      let requestToken = 0;
      input.dataset.isValid = "false";
      input.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        input.dataset.isValid = "false";
        clearTimeout(debounceTimer);
        if (query.length < 2) {
          dropdown.hide();
          return;
        }
        debounceTimer = setTimeout(() => {
          fetchCitySuggestions(query);
        }, 250);
      });
      input.addEventListener("click", () => {
        const query = input.value.trim();
        if (query.length >= 2) {
          fetchCitySuggestions(query);
        }
      });
      const dropdown = createDropdown({
        input,
        list: dropdownList,
        getItems: () => Array.from(dropdownList.querySelectorAll("[data-location-item]")),
        onSelect: (item) => item._select && item._select(),
        onOpen: () => {
          const query = input.value.trim();
          if (query.length >= 2) {
            fetchCitySuggestions(query);
          }
          return false;
        }
      });
      function buildAutocompleteRequest(query, withLanguage) {
        return {
          input: query,
          ...regionCode2 && { region: regionCode2 },
          ...includedRegionCodes2 && includedRegionCodes2.length > 0 && { includedRegionCodes: includedRegionCodes2 },
          ...withLanguage && language2 && { language: language2 }
        };
      }
      async function fetchCitySuggestions(query) {
        requestToken += 1;
        const token = requestToken;
        let suggestions;
        try {
          const res = await AutocompleteSuggestion2.fetchAutocompleteSuggestions(
            buildAutocompleteRequest(query, true)
          );
          suggestions = res.suggestions;
        } catch (err) {
          if (language2) {
            console.error(
              `Autocomplete failed with language "${language2}", retrying without it:`,
              err
            );
            try {
              const res = await AutocompleteSuggestion2.fetchAutocompleteSuggestions(
                buildAutocompleteRequest(query, false)
              );
              suggestions = res.suggestions;
            } catch (err2) {
              console.error("Failed to fetch autocomplete suggestions:", err2);
              dropdown.hide();
              return;
            }
          } else {
            console.error("Failed to fetch autocomplete suggestions:", err);
            dropdown.hide();
            return;
          }
        }
        if (token !== requestToken) return;
        if (!suggestions || suggestions.length === 0) {
          dropdown.hide();
          return;
        }
        const candidates = suggestions.slice(0, maxSuggestions2);
        const seenIds = /* @__PURE__ */ new Set();
        const uniqueCandidates = [];
        candidates.forEach((s) => {
          const id = s.placePrediction?.placeId;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            uniqueCandidates.push(s);
          }
        });
        const resolved = await Promise.all(
          uniqueCandidates.map(
            (s) => getCityCountryFromPlaceId(
              s.placePrediction.placeId,
              s.placePrediction.text?.text,
              s.placePrediction.structuredFormat
            )
          )
        );
        if (token !== requestToken) return;
        const uniqueLocations = [];
        const seen = /* @__PURE__ */ new Set();
        resolved.forEach((loc) => {
          if (!loc) return;
          const key = `${loc.city}-${loc.country}`.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            uniqueLocations.push(loc);
          }
        });
        renderSuggestions(uniqueLocations);
      }
      async function getCityCountryFromPlaceId(placeId, suggestionText, structuredFormat) {
        let city = null;
        let country = null;
        if (structuredFormat) {
          city = structuredFormat.mainText?.text || null;
          const secondary = structuredFormat.secondaryText?.text;
          if (secondary) country = extractCountryFromText(secondary);
        }
        if (!country && suggestionText) {
          country = extractCountryFromText(suggestionText);
        }
        if (!city) {
          try {
            const place = new Place2({ id: placeId });
            await place.fetchFields({ fields: ["addressComponents"] });
            if (place.addressComponents) {
              const structured = extractCityCountry(place.addressComponents);
              if (structured) {
                city = structured.city;
                if (!country) country = structured.country;
              }
            }
          } catch (err) {
            console.error("Failed to fetch place details:", err);
          }
        }
        if (!city || !country) return null;
        return { city, country };
      }
      function extractCountryFromText(text) {
        const lastComma = text.lastIndexOf(",");
        if (lastComma === -1) return null;
        const country = text.slice(lastComma + 1).trim();
        return country || null;
      }
      function extractCityCountry(components) {
        const findType = (type) => components.find((c) => c.types.includes(type))?.longText || null;
        const city = findType("locality") || findType("postal_town") || findType("sublocality") || findType("administrative_area_level_3") || findType("administrative_area_level_2") || findType("administrative_area_level_1");
        const country = findType("country");
        if (!city || !country) return null;
        return { city, country };
      }
      function renderSuggestions(locations) {
        dropdownList.innerHTML = "";
        if (locations.length === 0) {
          dropdown.hide();
          return;
        }
        locations.forEach(({ city, country }, index) => {
          const item = templateClone.cloneNode(true);
          const cityEl = item.querySelector("[data-location-city]");
          const countryEl = item.querySelector("[data-location-country]");
          if (cityEl) cityEl.textContent = city;
          if (countryEl) countryEl.textContent = country;
          if (!cityEl && !countryEl) {
            item.textContent = `${city}, ${country}`;
          }
          const fullString = `${city}, ${country}`;
          item.id = `${input.id || "location"}-option-${index}`;
          item.setAttribute("role", "option");
          item._select = () => selectLocation(fullString);
          item.addEventListener("click", (e) => {
            e.preventDefault();
            selectLocation(fullString);
          });
          dropdownList.appendChild(item);
        });
        dropdown.show();
      }
      function selectLocation(locationStr) {
        input.value = locationStr;
        input.dataset.isValid = "true";
        dropdown.hide();
        input.dispatchEvent(new CustomEvent("location-selected", { bubbles: true }));
      }
      dropdown.bindOutsideClick(fieldContainer);
    }
  }

  // src/features/transport-checkboxes.js
  function initTransportCheckboxes() {
    const modules = document.querySelectorAll("[data-rate-module]");
    modules.forEach((module) => {
      const checkboxes = module.querySelectorAll("[data-transport-checkbox]");
      checkboxes.forEach((checkbox) => {
        if (checkbox.dataset.transportValue === "sea") {
          checkbox.checked = true;
        }
      });
      checkboxes.forEach((checkbox) => {
        const label = checkbox.closest("label");
        if (label) {
          checkbox.addEventListener("focus", () => {
            label.style.outline = "2px solid #39f2af";
            label.style.outlineOffset = "2px";
          });
          checkbox.addEventListener("blur", () => {
            label.style.outline = "";
            label.style.outlineOffset = "";
          });
        }
      });
    });
  }
  function getSelectedTransportModes(module) {
    const scope = module || document;
    return Array.from(scope.querySelectorAll("[data-transport-checkbox]:checked")).map((checkbox) => checkbox.dataset.transportValue).filter(Boolean).join(",");
  }

  // src/features/validation.js
  var DEFAULT_BLUR_CHECK_DELAY_MS = 100;
  var LOCATION_BLUR_CHECK_DELAY_MS = 200;
  var FIELD_CONFIGS = [
    {
      name: "origin",
      inputSelector: '[data-location-input][name="cargo_origin"]',
      errorSelector: "[data-field-error-origin]",
      event: "input",
      trigger: "blur",
      // Defer the blur check so clicking the cargo dropdown button (which blurs
      // this field) doesn't run validation immediately — see
      // LOCATION_BLUR_CHECK_DELAY_MS.
      deferBlurCheck: true,
      blurCheckDelayMs: LOCATION_BLUR_CHECK_DELAY_MS,
      isValid: (module) => module.querySelector('[data-location-input][name="cargo_origin"]')?.dataset.isValid === "true"
    },
    {
      name: "destination",
      inputSelector: '[data-location-input][name="cargo_destination"]',
      errorSelector: "[data-field-error-destination]",
      event: "input",
      trigger: "blur",
      // Same deferred blur check as origin.
      deferBlurCheck: true,
      blurCheckDelayMs: LOCATION_BLUR_CHECK_DELAY_MS,
      isValid: (module) => module.querySelector('[data-location-input][name="cargo_destination"]')?.dataset.isValid === "true"
    },
    {
      name: "cargo",
      inputSelector: "[data-cargo-select]",
      // The visible input the user sees is [data-cargo-input]; the hidden
      // [data-cargo-select] is only used for the value + validity. The `.is-error`
      // class must go on the visible input.
      errorInputSelector: "[data-cargo-input]",
      errorSelector: "[data-field-error-cargo]",
      event: "change",
      trigger: "change",
      isValid: (module) => module.querySelector("[data-cargo-select]")?.dataset.isValid === "true"
    },
    {
      name: "date",
      inputSelector: "[data-date-input]",
      errorSelector: "[data-field-error-date]",
      event: "change",
      // Validate on change (not blur). Flatpickr fires a native `change` event
      // on the input AFTER it sets data-is-valid in its onChange, so the error
      // hides the moment a valid date is picked. Validating on blur instead
      // caused a race: the blur fired before Flatpickr marked the field valid,
      // so a correct date could briefly flash a false error.
      trigger: "change",
      isValid: (module) => module.querySelector("[data-date-input]")?.dataset.isValid === "true"
    },
    {
      name: "transport",
      inputSelector: "[data-transport-checkbox]",
      errorSelector: "[data-field-error-transport]",
      event: "change",
      trigger: "change",
      isValid: (module) => getSelectedTransportModes(module) !== ""
    }
  ];
  function initValidation() {
    const modules = document.querySelectorAll("[data-rate-module]");
    modules.forEach((module) => initModuleValidation(module));
  }
  function initModuleValidation(module) {
    const calculateButton = module.querySelector("[data-calculate-button]");
    const debugEl = module.querySelector("[data-validation-debug]");
    FIELD_CONFIGS.forEach((config) => {
      hideError(module.querySelector(config.errorSelector), getErrorInputs(module, config));
    });
    const setButtonDisabled = (disabled) => {
      if (!calculateButton) return;
      calculateButton.disabled = disabled;
      if (disabled) {
        calculateButton.setAttribute("aria-disabled", "true");
        calculateButton.setAttribute("tabindex", "-1");
      } else {
        calculateButton.removeAttribute("aria-disabled");
        calculateButton.removeAttribute("tabindex");
      }
    };
    const updateButtonState = () => {
      const allValid = FIELD_CONFIGS.every((config) => config.isValid(module));
      setButtonDisabled(!allValid);
    };
    if (calculateButton) {
      calculateButton.addEventListener("click", (e) => {
        const results = validateAllFields(module);
        updateDebug(debugEl, results);
        if (!Object.values(results).every(Boolean)) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }
    FIELD_CONFIGS.forEach((config) => {
      const inputs = module.querySelectorAll(config.inputSelector);
      if (inputs.length === 0) return;
      const errorEl = module.querySelector(config.errorSelector);
      if (config.trigger === "blur") {
        inputs.forEach((input) => {
          input.addEventListener("blur", () => {
            const check = () => {
              if (config.isValid(module)) {
                hideError(errorEl, getErrorInputs(module, config));
              } else {
                showError(errorEl, getErrorInputs(module, config));
              }
              updateDebug(debugEl, readAllFieldStates(module));
            };
            if (config.deferBlurCheck) {
              setTimeout(check, config.blurCheckDelayMs || DEFAULT_BLUR_CHECK_DELAY_MS);
            } else {
              check();
            }
          });
        });
        const onFieldChange = () => {
          updateButtonState();
        };
        inputs.forEach((input) => {
          input.addEventListener(config.event, onFieldChange);
          if (input.hasAttribute("data-location-input")) {
            input.addEventListener("location-selected", () => {
              if (config.isValid(module)) {
                hideError(errorEl, getErrorInputs(module, config));
              } else {
                showError(errorEl, getErrorInputs(module, config));
              }
              updateButtonState();
              updateDebug(debugEl, readAllFieldStates(module));
            });
          }
        });
      } else {
        const onFieldChange = () => {
          if (config.isValid(module)) {
            hideError(errorEl, getErrorInputs(module, config));
          } else {
            showError(errorEl, getErrorInputs(module, config));
          }
          updateButtonState();
          updateDebug(debugEl, readAllFieldStates(module));
        };
        inputs.forEach((input) => {
          input.addEventListener(config.event, onFieldChange);
        });
      }
    });
    updateButtonState();
  }
  function validateAllFields(module) {
    const results = {};
    FIELD_CONFIGS.forEach((config) => {
      const valid = config.isValid(module);
      results[config.name] = valid;
      const errorEl = module.querySelector(config.errorSelector);
      if (valid) {
        hideError(errorEl, getErrorInputs(module, config));
      } else {
        showError(errorEl, getErrorInputs(module, config));
      }
    });
    return results;
  }
  function readAllFieldStates(module) {
    const states = {};
    FIELD_CONFIGS.forEach((config) => {
      states[config.name] = config.isValid(module);
    });
    return states;
  }
  function getErrorInputs(module, config) {
    return module.querySelectorAll(config.errorInputSelector || config.inputSelector);
  }
  function showError(errorEl, inputs) {
    if (errorEl) {
      errorEl.style.display = "block";
      errorEl.classList.remove("hide");
    }
    if (inputs) {
      const list = inputs.forEach ? inputs : [inputs];
      list.forEach((input) => input.classList.add("is-error"));
    }
  }
  function hideError(errorEl, inputs) {
    if (errorEl) {
      errorEl.style.display = "none";
      errorEl.classList.add("hide");
    }
    if (inputs) {
      const list = inputs.forEach ? inputs : [inputs];
      list.forEach((input) => input.classList.remove("is-error"));
    }
  }
  function updateDebug(debugEl, states) {
    if (!debugEl) return;
    const parts = Object.entries(states).map(
      ([name, valid]) => `${name}: ${valid ? "true" : "false"}`
    );
    debugEl.textContent = parts.join(" | ");
  }

  // src/services/sync-modules.js
  function initModuleSync() {
    const modules = document.querySelectorAll("[data-rate-module]");
    if (modules.length < 2) return;
    let syncing = false;
    const state = {
      origin: { value: "", valid: false },
      destination: { value: "", valid: false },
      cargo: { value: "", label: "", valid: false },
      date: { value: "", iso: "", valid: false },
      transport: []
    };
    modules.forEach((module) => {
      wireLocation(module, "cargo_origin", "origin");
      wireLocation(module, "cargo_destination", "destination");
      wireCargo(module);
      wireDate(module);
      wireTransport(module);
    });
    function wireLocation(module, name, key) {
      const input = module.querySelector(`[data-location-input][name="${name}"]`);
      if (!input) return;
      const sync = () => {
        if (syncing) return;
        syncing = true;
        try {
          state[key] = { value: input.value, valid: input.dataset.isValid === "true" };
          modules.forEach((m) => {
            if (m === module) return;
            const target = m.querySelector(`[data-location-input][name="${name}"]`);
            if (!target || target === document.activeElement) return;
            target.value = state[key].value;
            target.dataset.isValid = state[key].valid ? "true" : "false";
            target.dispatchEvent(new CustomEvent("location-selected", { bubbles: true }));
          });
        } finally {
          syncing = false;
        }
      };
      input.addEventListener("blur", sync);
      input.addEventListener("location-selected", sync);
    }
    function wireCargo(module) {
      const select = module.querySelector("[data-cargo-select]");
      const display = module.querySelector("[data-cargo-input]");
      if (!select) return;
      const sync = () => {
        if (syncing) return;
        syncing = true;
        try {
          state.cargo = {
            value: select.value,
            label: display ? display.value : "",
            valid: select.dataset.isValid === "true"
          };
          modules.forEach((m) => {
            if (m === module) return;
            const targetSelect = m.querySelector("[data-cargo-select]");
            const targetDisplay = m.querySelector("[data-cargo-input]");
            if (!targetSelect) return;
            targetSelect.value = state.cargo.value;
            targetSelect.dataset.isValid = state.cargo.valid ? "true" : "false";
            if (targetDisplay) targetDisplay.value = state.cargo.label;
            targetSelect.dispatchEvent(new Event("change", { bubbles: true }));
          });
        } finally {
          syncing = false;
        }
      };
      select.addEventListener("change", sync);
    }
    function wireDate(module) {
      const input = module.querySelector("[data-date-input]");
      if (!input) return;
      const sync = () => {
        if (syncing) return;
        syncing = true;
        try {
          state.date = {
            value: input.value,
            iso: input.dataset.dateIso || "",
            valid: input.dataset.isValid === "true"
          };
          modules.forEach((m) => {
            if (m === module) return;
            const target = m.querySelector("[data-date-input]");
            if (!target || target === document.activeElement) return;
            if (target._flatpickr && state.date.iso) {
              target._flatpickr.setDate(state.date.iso, false, "Y-m-d");
            } else {
              target.value = state.date.value;
            }
            target.dataset.dateIso = state.date.iso;
            target.dataset.isValid = state.date.valid ? "true" : "false";
            target.dispatchEvent(new Event("change", { bubbles: true }));
          });
        } finally {
          syncing = false;
        }
      };
      input.addEventListener("change", sync);
      input.addEventListener("blur", sync);
    }
    function wireTransport(module) {
      const checkboxes = module.querySelectorAll("[data-transport-checkbox]");
      if (checkboxes.length === 0) return;
      const sync = () => {
        if (syncing) return;
        syncing = true;
        try {
          state.transport = Array.from(
            module.querySelectorAll("[data-transport-checkbox]:checked")
          ).map((cb) => cb.dataset.transportValue);
          modules.forEach((m) => {
            if (m === module) return;
            const targetCheckboxes = m.querySelectorAll("[data-transport-checkbox]");
            targetCheckboxes.forEach((cb) => {
              const shouldCheck = state.transport.includes(cb.dataset.transportValue);
              cb.checked = shouldCheck;
            });
            targetCheckboxes.forEach((cb) => {
              cb.dispatchEvent(new Event("change", { bubbles: true }));
            });
            targetCheckboxes.forEach((cb) => {
              const shouldCheck = state.transport.includes(cb.dataset.transportValue);
              const visual = cb.previousElementSibling;
              if (visual && visual.classList.contains("w-checkbox-input")) {
                visual.classList.toggle("w--redirected-checked", shouldCheck);
              }
            });
          });
        } finally {
          syncing = false;
        }
      };
      checkboxes.forEach((cb) => {
        cb.addEventListener("change", sync);
        const label = cb.closest("label");
        if (label) {
          label.addEventListener("click", () => setTimeout(sync, 0));
        }
      });
    }
  }

  // src/services/url-builder.js
  var CONTAINER_OMIT = "LCL";
  var CONTAINER_EMPTY = "FCL";
  function initUrlBuilder() {
    const modules = document.querySelectorAll("[data-rate-module]");
    modules.forEach((module) => initModuleUrlBuilder(module));
  }
  function initModuleUrlBuilder(module) {
    const calculateButton = module.querySelector("[data-calculate-button]");
    if (!calculateButton) return;
    const debugEl = module.querySelector("[data-url-debug]");
    const form = module.querySelector("[data-rate-form]");
    if (form) {
      form.addEventListener("submit", (e) => e.preventDefault());
    }
    const refreshDebug = () => {
      if (!debugEl) return;
      debugEl.textContent = buildRedirectUrl(calculateButton, module);
    };
    module.querySelectorAll("[data-location-input]").forEach((input) => {
      input.addEventListener("input", refreshDebug);
      input.addEventListener("location-selected", refreshDebug);
    });
    module.querySelectorAll("[data-date-input]").forEach((input) => input.addEventListener("change", refreshDebug));
    module.querySelectorAll("[data-cargo-select]").forEach((select) => select.addEventListener("change", refreshDebug));
    module.querySelectorAll("[data-transport-checkbox]").forEach((checkbox) => checkbox.addEventListener("change", refreshDebug));
    calculateButton.addEventListener("click", (e) => {
      const url = buildRedirectUrl(calculateButton, module);
      if (debugEl) debugEl.textContent = url;
      calculateButton.href = url;
      if (!calculateButton.disabled) {
        e.preventDefault();
        window.location.assign(url);
      }
    });
  }
  function buildRedirectUrl(calculateButton, module) {
    const rawBase = calculateButton.getAttribute("href") || "";
    const baseUrl = !rawBase || rawBase === "/" || rawBase === "#" ? "/calculator" : rawBase;
    const params = new URLSearchParams();
    const origin = getFieldValue(module, '[data-location-input][name="cargo_origin"]');
    const destination = getFieldValue(module, '[data-location-input][name="cargo_destination"]');
    const transportDate = getDateIso(module);
    const transportMode = getSelectedTransportModes(module);
    const containerType = getFieldValue(module, "[data-cargo-select]");
    if (origin) params.set("origin", origin);
    if (destination) params.set("destination", destination);
    if (transportDate) params.set("transportDate", transportDate);
    if (transportMode) params.set("transportMode", transportMode);
    if (containerType && containerType !== CONTAINER_OMIT) {
      params.set("containerType", containerType === CONTAINER_EMPTY ? "" : containerType);
    }
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }
  function getFieldValue(module, selector) {
    const el = module.querySelector(selector);
    return el ? el.value.trim() : "";
  }
  function getDateIso(module) {
    const input = module.querySelector("[data-date-input]");
    return input?.dataset.dateIso || "";
  }

  // src/index.js
  window.addEventListener("load", async () => {
    initCargoDropdown();
    initDatePicker();
    initTransportCheckboxes();
    await initLocationAutocomplete();
    initValidation();
    initUrlBuilder();
    initModuleSync();
  });
})();
//# sourceMappingURL=index.js.map
