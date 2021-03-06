//>>excludeStart("jqmBuildExclude", pragmas.jqmBuildExclude);
//>>description: Adds a filterbar to an element collection
//>>label: Filter
//>>group: Widgets


define( [ "jquery", "./forms/textinput" ], function( jQuery ) {
//>>excludeEnd("jqmBuildExclude");
(function( $, undefined ) {
  "use strict";

  // TODO rename filterCallback/deprecate and default to the item itself as the first argument
  var defaultfilterCallback = function( text, searchValue /*, item */) {
    return text.toString().toLowerCase().indexOf( searchValue ) === -1;
  };

  $.widget("mobile.filterbar", $.mobile.widget, $.extend( {

      options: {
        filterTheme: "a",
        filterPlaceholder: "Filter items...",
        filterReveal: false,
        filterCallback: defaultfilterCallback,
        inset: false,
        enhance: true,
        target: null,
        selector: null,
        mini: false
      },

      _onKeyUp: function() {
        var self = this,
          search = self._search[ 0 ],
          o = self.options,
          getAttrFixed = $.mobile.getAttribute,
          val = search.value.toLowerCase(),
          lastval = getAttrFixed( search, "lastval", true ) + "";

        if ( lastval && lastval === val ) {
          // Execute the handler only once per value change
          return;
        }
        
        // Change val as lastval for next execution
        search.setAttribute( "data-" + $.mobile.ns + "lastval" , val );

        if (o.timer !== undefined) {
          window.clearTimeout(o.timer);
        }

        self._trigger( "beforefilter", "beforefilter", { input: search } );
          
        o.timer = window.setTimeout(function() {
          self._filterItems( search, val, lastval )
        }, 250);
      },

      _getFilterableItems: function() {
        var self = this,
          el = self.element,
          o = self.options,
          items = [];

        if (typeof o.selector === "string") {
          items = $("." + o.selector).children();
        } else {
          items = el.find("> li, > option, tbody tr, .ui-controlgroup-controls .ui-btn");
        }
        return items;
      },
      
      _setFilterableItems: function(val, lastval) {
        var self = this,
          o = self.options,
          filterItems = [],
          isCustomfilterCallback = o.filterCallback !== defaultfilterCallback,
          _getFilterableItems = self._getFilterableItems();
        
        if ( isCustomfilterCallback || val.length < lastval.length || val.indexOf( lastval ) !== 0 ) {

          // Custom filter callback applies or removed chars or pasted something totally different, check all items
          filterItems = _getFilterableItems;
        } else {

          // Only chars added, not removed, only use visible subset
          filterItems = _getFilterableItems.filter( ":not(.ui-screen-hidden)" );

          if ( !filterItems.length && o.filterReveal ) {
            filterItems = _getFilterableItems.filter( ".ui-screen-hidden" );
          }
        }
        return filterItems;
      },
      
      _filterItems: function( search, val, lastval ){
        var self = this,
          el = self.element,
          o = self.options,
          getAttrFixed = $.mobile.getAttribute,
          filterItems = self._setFilterableItems(val, lastval),
          _getFilterableItems = self._getFilterableItems(),
          childItems = false,
          itemtext = "",
          item,
          i;

        self._setOption( "timer", undefined );

        if ( val ) {

          // This handles hiding regular rows without the text we search for
          // and any list dividers without regular rows shown under it

          for ( i = filterItems.length - 1; i >= 0; i-- ) {
            item = $( filterItems[ i ] );
            itemtext = getAttrFixed(filterItems[ i ], "filtertext", true) || item.text();

            if ( item.is( ".ui-li-divider" ) ) {

              item.toggleClass( "ui-filter-hidequeue" , !childItems );

              // New bucket!
              childItems = false;

            } else if ( o.filterCallback( itemtext, val, item ) ) {

              //mark to be hidden
              item.toggleClass( "ui-filter-hidequeue" , true );
            } else {

              // There's a shown item in the bucket
              childItems = true;
            }
          }
          
          self._toggleFilterableItems( filterItems, o.filterReveal , true);
        } else {
          self._toggleFilterableItems( filterItems, o.filterReveal );
        }

        self._addFirstLastClasses( _getFilterableItems, self._getVisibles( _getFilterableItems, false ), false );
      },
      
      _toggleFilterableItems: function( filterItems, reveal, isVal )  {

        if (isVal) {
          // Show items, not marked to be hidden
          filterItems
            .filter( ":not(.ui-filter-hidequeue)" )
            .toggleClass( "ui-screen-hidden", false );

          // Hide items, marked to be hidden
          filterItems
            .filter( ".ui-filter-hidequeue" )
            .toggleClass( "ui-screen-hidden", true )
            .toggleClass( "ui-filter-hidequeue", false );
        } else {
          //filtervalue is empty => show all
          filterItems.toggleClass( "ui-screen-hidden", !!reveal );
        }
      },
      
      _enhance: function () {
        var self = this,
          el = this.element,
          o = self.options,
          wrapper = $( "<div>", {
            "class": "ui-filter ",
            "role": "search"
          }),
          search = $( "<input>", {
            placeholder: o.filterPlaceholder
          })
          .attr( "data-" + $.mobile.ns + "type", "search" )
          .appendTo( wrapper )
          .textinput({
            theme: o.filterTheme,
            mini: o.mini
          });

        if ( o.inset ) {
          wrapper.addClass( "ui-filter-inset" );
        }

        if ( typeof o.target === "string" ) {
          wrapper.prependTo( $( "." + o.target + "" ) );
        } else {
          wrapper.insertBefore( el );
        }
        
        return search;
      },

      _create: function() {
        var self = this,
          o = self.options,
          search,
          items = self._getFilterableItems();
        
        if ( o.filterReveal ) {
          items.addClass( "ui-screen-hidden" );
        }
        
        self._setOption( "timer", undefined );

        if (o.enhance) {
          search = self._enhance();
        } else {
          search = self.element.find("input");
        }

        // "reset"
        search.attr("data-" + $.mobile.ns + "-lastval", "");

        self._on( search, { keyup: "_onKeyUp", change: "_onKeyUp", input: "_onKeyUp" } );
        
        $.extend( self, {
          _search: search
        });
        
        // NOTE: since the filter was based on the listview, some unit tests seem
        // to listen for the initial addFirstLastClasses call when the listview 
        // is setup (at least I cannot recreate a refreshCornerCount in Qunit
        // without setting first and last classes on the filterable elements on
        // create). If refresh corners is to be run on the filter, I would prefer
        // it being solely called by the filter being triggered and not be the 
        // "_super()-widget" calling it. So 2x input on the filter should trigger
        // 2x addFirstLastClasses vs. currently 3x because of including the call
        // when setting up the parent listview.
        self._addFirstLastClasses( items, self._getVisibles( items, true ), true );
      },

      _setOptions: function( options ) {
        var self = this,
          key;

        for ( key in options ) {
          self._setOption( key, options[ key ] );
        }

        return self;
      },
      
      _setOption: function( key, value ) {
        var self = this;

        self.options[ key ] = value;

        if ( key === "disabled" ) {
          self.widget()
            .toggleClass( self.widgetFullName + "-disabled ui-state-disabled", !!value )
            .attr( "aria-disabled", value );
          self.hoverable.removeClass( "ui-state-hover" );
          self.focusable.removeClass( "ui-state-focus" );
        }
        return self;
      },
      
      widget: function() {
        return this.filterbar;
      },
      
      enable: function() {
        return this._setOption( "disabled", false );
      },

      disable: function() {
        return this._setOption( "disabled", true );
      }, 
      
      destroy: function() {
        var self = this;
        self.element.parents( ".ui-filter" ).remove();
        self._destroy();
      }

  }, $.mobile.behaviors.addFirstLastClasses ) );

  $.mobile.filterbar.initSelector = ':jqmData(filter="true")';

  //auto self-init widgets
  $.mobile._enhancer.add( "mobile.filterbar" );

})( jQuery );
//>>excludeStart("jqmBuildExclude", pragmas.jqmBuildExclude);
});
//>>excludeEnd("jqmBuildExclude");
