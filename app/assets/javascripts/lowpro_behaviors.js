
// rails friendly "delete" (does not degrade!)
Remote.DeleteLink = $.klass(Remote.Base,{
  onclick: function(){
    var options = $.extend({
      url: this.element.attr('href'),
      type: 'POST',
      data: $.param({'authenticity_token':window.authenticityToken,'_method':'delete'})
      },this.options);
    return this._makeRequest(options);
  }
});

// rails friendly 'put'
Remote.PutLink = $.klass(Remote.Base,{
  onclick: function(){
    var options = $.extend({
      url: this.element.attr('href'),
      type: 'POST',
      data: $.param({'authenticity_token':window.authenticityToken,'_method':'put'})
      },this.options);
    return this._makeRequest(options);
  }
});

DismissableNotice = $.klass(Remote.PutLink,{
  initialize: function($super){
    this.notice = this.element.parents('div.notice');
    $super(); // make sure to call init on parent
  },

  success:function(e){
    this.notice.fadeOut('slow');
  }
});


FavoriteToggle = $.klass(Remote.Link,{

  // set the correct state to begin with
  // based on whether it's included in userFavorites array

  initialize:function($super, options){
    if(this.isGuest()) { this.hide() }
    var asset_id = this.element.attr('href').split('=')[1]; // grab the id from the href
    if(window.userFavorites.length > 0){
      var item = jQuery.grep(window.userFavorites, function(element, index){
        return element == Number(asset_id);
      });
      if(item.length > 0){ // user has it as a fav
        this.element.addClass('favorited');
      }
    }
    $super();
  },

  beforeSend:function(e){
    // modify the link to use the correct user's username
    // this.element.attr("href",window.userPersonalization+this.element.attr('href'));
    if(this.element.hasClass('favorited'))
      this.element.removeClass('favorited');
    else
      this.element.addClass('favorited');
  },
  isGuest:function(){
    return (window.username == 'Guest'); // don't show toggle to guests
  },
  hide:function(){
    this.element.remove();
  }
});

FollowToggle = $.klass(Remote.Link,{
  beforeSend:function(e){
    if(this.element.hasClass('following')){
      this.element.removeClass('following');
      this.element.html('<div class="sprites-heart-with-plus"></div> follow');
    }
    else{
      this.element.addClass('following');
      this.element.html('<div class="sprites-heart-broken"></div> un-follow');
    }
  }
});


if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(elt /*, from*/)
  {
    var len = this.length;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}

// for debug purposes
$.fn.log = function() {
  if (this.size()==0) return "<em>wrapped set is empty</em>"
  var text = '';
  this.each(function(){
    text += this.tagName;
    if (this.id) text += '#' + this.id;
  });
  return text;
}

// hack up a periodical executor
jQuery.timer = function (interval, callback)
 {
	var interval = interval || 100;

	if (!callback)
		return false;

	_timer = function (interval, callback) {
		this.stop = function () {
			clearInterval(self.id);
		};

		this.internalCallback = function () {
			callback(self);
		};

		this.reset = function (val) {
			if (self.id)
				clearInterval(self.id);

			var val = val || 100;
			this.id = setInterval(this.internalCallback, val);
		};

		this.interval = interval;
		this.id = setInterval(this.internalCallback, this.interval);

		var self = this;
	};

	return new _timer(interval, callback);
};

jQuery.easing.def = "jswing"

SortablePlaylist = $.klass({
  initialize : function(){
    this.tracks = $('.tracks', this.element);
    this.sortURL = $('#sort_tracks_url').attr('href');
    this.addTrackURL = $('#add_track_url').attr('href');
    this.emptyWarning = $('.empty',this.element);
    this.create_sortable();
    this.element.droppable({
      accept: ".ui-draggable",
      drop: $.bind(this.add_track, this), // LOVE danwebb and $.bind
      hoverClass: 'adding',
      tolerance: 'touch',
      // change the text to reflect which track
      over: function(e, ui){ $('#drop_here').html('Drop to add "' +($('.track_link',ui.draggable).html()) + '"')}
    });
  },
  serialize_and_post : function(){
    $.post(this.sortURL,$.param({'authenticity_token':window.authenticityToken})+'&'+this.sortable_tracks.sortable('serialize') );
  },
  add_track : function (e,ui){
    $.ajax({
      type: "POST",
      url: this.addTrackURL,
      data: $.param({'asset_id':ui.draggable.attr('id'), 'authenticity_token':window.authenticityToken}),
      dataType: 'html'
    }).done($.bind(this.insert_track,this))
  },
  // does the work of inserting the new track and recreating the sortable
  insert_track: function(new_track_html){
    $('#drop_here').before(new_track_html);
    if(this.sortable_tracks != undefined)
      this.sortable_tracks.sortable('refresh');
    else
      this.create_sortable();
  },
  // catch all delete/remove calls
  onclick: $.delegate({
    'a.remove' : function(e){ return this.remove_track(e.target)}
  }),
  onmouseover:$.delegate({
    '.asset':function(e){ $(e).css({cursor:'move'})}
  }),

  // delete track and remove on success
  remove_track: function(target){
    $(target).html('wait...').parents('.asset').addClass('hover');
    // delete track and remove on success
    $.get($(target).attr('href'),$.bind(this.fade_out,target));
    return false;
  },
  fade_out: function(){
    $(this).parents('.asset').slideUp().remove();
  },
  create_sortable: function(){
    if($('.asset',this.tracks).size() > 1){
     this.sortable_tracks = this.tracks.sortable({
      items: '.asset',
      revert:true,
      containment:'.tracks',
      scroll: true,
      cursor: 'move',
      scrollSensitivity: 100,
      update: $.bind(this.serialize_and_post, this)
    });
    //if(this.emptyWarning) this.emptyWarning.slideUp();
    }
  }

});

Uploader = $.klass({
  initialize: function(){
    this.form = $('form',this.element);
    this.submit = $('input[type=submit]', this.form);
    this.field = $('ul.filefields > li > input',this.form);
    this.clone = $('ul.filefields > li:first', this.form)
    this.field.change($.bind(this.addField, this));
    this.count = 0;
    this.uploading = $('.uploading', this.element);
    this.form.submit($.bind(this.waiting, this));
  },
  addField: function(e){
    $('ul.filefields',this.form).append(this.clone.clone());
    $('ul.filefields li:last input',this.form).val('').change($.bind(this.addField, this));
    var count = ++this.count;
    this.submit.each(function() {
      this.value = this.value.replace(/Upload( \d+ files)?/,
                                      'Upload ' + count + ' files');
    });
  },
  waiting: function(){
    this.form.hide();
    this.uploading.show();
    this.uploading.prepend('Uploading '+this.count+' files...<br/><br/>');
  }
});


PlaylistSource = $.klass({
  onclick: $.delegate({
    '.pagination a' : function(e){
        $(e.target).parents('.playlist_source').load(e.target.href, function(){
            $('.asset',this).draggable({
              revert:true,
              //helper:'clone',
              cursor:'move',
              snap: true,
              zindex: 800
              });
        });

        // we're not using livequery or delegating the drag/drop..
        return false;
      }})
});
ResizeableFooter = $.klass({
  initialize:function(){
    this.next = this.element.next();
    this.originalHeight = 0;
    this.opened = false;
    this.form = $('#bug_form',this.next);
  },
  onclick: $.delegate({
    '.feedback' : function(e){ return this.toggleFooter()}
    }),

  toggleFooter:function (){
    this.opened ? this.close() : this.open();
    return false;
  },

  close: function(){
   // this.form.fadeOut(10);
    this.next.animate({
      opacity: 0.6,
      height: this.originalHeight+'px'
    },500,'jswing');
    this.opened = false;
  },

  open: function(){
    this.next.show();
    this.next.css({opacity:0.999});
    this.next.animate({
      height: "250px"
    },600,'easeOutQuad');
    this.form.show();
    this.form.animate({
      opacity: 0.999
    },1200,'jswing');
    $('.feedback',this.form).click($.bind(this.close,this))

    $('#new_user_report',this.form).attach(CommentForm);
    this.opened = true;

  }

});

SlideOpenNext = $.klass({
  initialize:function(to_open){
    this.next = (to_open == undefined ? this.element.next() : (to_open == 'href' ? $(this.element.attr('href')) : $(to_open)));
  },
  onclick:function(){
    this.next.slideToggle('slow');
    return false;
  }

});

// text area that grows 2x in size upon need
AdjustableTextarea = $.klass({

  initialize : function(line_height){
    this.line_height = line_height;
    this.character_width = this.element.attr('cols');
  },
  checkForSizeChange : function(){
    if(this.collapsed_height_in_px == undefined) this.set_collapsed_height();
    lines = this.element.val().split("\n");
    actual_row_count = lines.length;
    for(line in actual_row_count){
      actual_row_count += parseInt(line.length / this.character_width);
    }
    if(this.starting_row_count < actual_row_count)
      this.element.css({height:(this.collapsed_height_in_px*2)+'px'});
    else
      this.element.css({height:this.collapsed_height_in_px+'px'});

  },
  onkeypress: function(){
    this.checkForSizeChange();
  },
  oninput: function(){
    this.checkForSizeChange();
  },
  onpaste: function(){
    this.checkForSizeChange();
  },
  set_collapsed_height: function(){
    // done here, because at first textarea may be hidden
    this.collapsed_height_in_px = this.element.height();
    this.starting_row_count = parseInt(this.collapsed_height_in_px / this.line_height);
  }

});

// abstracts ui.tabs a bit further
Tabbies = $.klass({
  initialize : function(desiredTab){
    // rewrite ids to further specify (rails caching can mean several tabs have same id, screwing things up)
    var extraId = String(Math.floor(Math.random()*110));
    $('ul li a',this.element).each(function(i){
      $(this).attr('href',$(this).attr('href')+extraId)
    });
    $('>div',this.element).each(function(i){
      $(this).attr('id',$(this).attr('id')+extraId)
    });

    this.defaultTab = 0;
    this.currentTab = desiredTab || this.defaultTab;
    this.element.tabs({
      active: this.currentTab
    });

    // when switching tabs, always focus on comment box if on comment tab
    this.element.bind('activate', function(event, ui) {
        if(ui.index==0)
          $('textarea',ui.panel).focus();
    });
  },
  openTab : function(desiredTab){
    desiredTab = desiredTab || this.defaultTab;
    this.element.tabs( "option", "active", desiredTab );
    this.currentTab = desiredTab;
  }
});

CommentForm = $.klass(Remote.Form, {
    initialize : function($super,options) {
      this.submitButton = $('.comment_submit', this.element);
      this.submitText = this.submitButton.val();
      this.spinner = $('.small_spinner',this.element);
      this.resultBox = $('.comment_waiting', this.element);
      this.textarea = $('textarea', this.element);
      this.checkbox = $(':checkbox.private', this.element);

      if(this.checkbox != undefined) this.checkbox.click($.bind(this.togglePrivate,this));

      // replace the empty comment personalization with js payload
       $('.comment_as', this.element).replaceWith(window.userPersonalization);

      $super();
    },
    beforeSend:function(){
      this.spinner.show();
      this.disable();
    },
    complete:function(){
      this.spinner.hide();
      this.enable();
    },
    success:function(e){
      this.resultBox.html('<div class="ajax_success">Submitted, thanks!</p>').fadeIn(100);
      this.textarea.val('');
    },
    error: function(){
      this.resultBox.html("<div class='ajax_fail'>Sorry, that didn't work</p>").fadeIn(100);
    },
    disable:function(){
      this.submitButton.attr('disabled','disabled').
        val('sending comment...');
    },
    enable:function(){
      this.submitButton.removeAttr('disabled').
        val(this.submitText);
    },
    togglePrivate:function(){
      if(this.checkbox.is(':checked')){
        $('span.private', this.element).show();
        $('span.public',this.element).hide();
        this.textarea.addClass('private');
      }else{
        $('span.public',this.element).show();
        $('span.private',this.element).hide();
        this.textarea.removeClass('private');
      }
    }
});

EditForm = $.klass(Remote.Form,{
    initialize : function($super,options) {
      this.submitButton = $('.comment_submit', this.element);
      this.submitText = this.submitButton.val();
      this.spinner = $('.small_spinner',this.element);
      this.resultBox = $('.comment_waiting', this.element);
      this.textarea = $('textarea', this.element);
      $super();
    },
    beforeSend:function(){
      this.spinner.show();
      this.disable();
    },
    complete:function(){
      this.spinner.hide();
      this.enable();
    },
    success:function(){
      this.resultBox.text('Saved, thanks!').fadeIn(100);
    },
    error: function(){
      this.resultBox.text("Didn't work. Try again?").fadeIn(100);
    },
    disable:function(){
      this.submitButton.attr('disabled','disabled').
        val('saving...');
    },
    enable:function(){
      this.submitButton.removeAttr('disabled').
        val(this.submitText);
    }
});

TrackSeekbar = $.klass({
  initialize: function(track) {
    var seekbar = this;
    this.track = track;
    this.seekbar = $(this.element);
    this.loaded = $('.loaded', this.element);
    this.played = $('.played', this.element);

    this.loaded.mousedown(function(e) {
      var sound = track.getSound();
      var x = (e.offsetX || e.clientX - $(e.target).offset().left);
      var value = x / $(this).parents('.seekbar').width();
      var pos = value * sound.durationEstimate;
      sound.setPosition(pos);
    });
  },

  updatePlayed: function() {
    var sound = this.track.getSound();
    var value = sound.position / sound.durationEstimate;
    var maxwidth = this.seekbar.width();
    this.played.css('width', value * maxwidth);
  },

  updateLoaded: function() {
    var sound = this.track.getSound();
    var value = sound.duration / sound.durationEstimate;
    this.element.addClass('initialized');
    this.loaded.css('width', 100 * value + '%');
  }
});

Track = $.klass({
  initialize: function() {
    this.element.addClass('instantiated');

    this.innerPlay = $(".play-button",this.element).children().eq(0);

    this.playButton = $(".play-button",this.element);
    this.trackLink = $("a.track_link",this.element);
    this.time = $('div.counter',this.element);
    this.track_title = $('a.track_link',this.element).html();
    this.artist = $('a.artist',this.element).html();
    this.deleteButton = $(".delete-button",this.element);
    this.trackURL = $('a.play_link',this.element).attr('href');
    this.soundID = this.trackURL.split('/').pop().split('.')[0];
    this.more = this.element.children().last();
    this.seekbar = $('.seekbar', this.element).attach(TrackSeekbar, this);
    this.tabbies = false; // wait on initializing the tabs until we need them
    this.originalDocumentTitle = document.title; // for prepending when playing tracks
    this.radio = false;
    this.reachedEnd = false;
    this.owner = $('.artist',this.element).attr('href').replace('/','');
    // dont allow tab details to be opened on editing playlists
    this.allowDetailsOpen = (this.element.hasClass('unopenable') || (this.element.parent().parent('#single_track').size() > 0)) ? false : true;
  },


  // Lets Delegate!
  // we want the track to do lots of things onclick, but not add 100s of event handlers
  // so test the origin element of the click using selectors
  onclick: $.delegate({
    '.play_link' : function(e){ return this.togglePlay()},      // open comments
    '.track_link': function(e){ return this.toggleDetails(1)}, // open info
    '.download_link':function(e){ return this.toggleDetails(2)}, // open sharing
    '.title':function(e){ return this.toggleDetails(1)},  // open
    '.title_left_column_bottom':function(e){ return this.toggleDetails(1)},  // open
    '.title_left_column_top':function(e){ return this.toggleDetails(1)}  // open
  }),

  onmouseenter: $.delegate({
    '.asset' : function(e){  this.element.addClass('hover');}
  }),

  onmouseleave: $.delegate({
    '.asset' : function(e){  this.element.removeClass('hover');}
  }),

  trackIndex: function(){
    var instances = TrackInstances();
    return instances.indexOf(this);
  },

  toggleDetails: function(desiredTab){

    if (this.more.is(':hidden')) this.openDetails(desiredTab);
    else if (this.isPlaying()) this.openDetails(desiredTab); // never close the tabs when playing
    else this.closeDetails();
    return false;
  },

  openDetails: function(desiredTab){

    // don't allow this to happen when editing playlist
    if(!this.allowDetailsOpen) return false;

    // set up the tabs if this track hasn't been opened yet
    if(!this.tabbies) this.createTabbies();

    // change the tab if the clicked tab is not currently open
    if(this.tabbies.currentTab != desiredTab) this.tabbies.openTab(desiredTab);

    // open the pane if it is not already open
    if(this.isOpen != false) this.more.slideDown(300,function(){
        $('textarea',this).focus();
    });

		// Show the edit link if admin and/or owner
		if((this.owner===window.username) || window.userIsAdmin){
		  $('.show_to_admin_or_owner', this.more).show();

		  // Show some text prompting them to edit if no description
		  if($('.description .user_description :not(h3)', this.more).text() == ""){
		    var href = $('.edit_in_box', this.more).attr('href');
		    var prompt = '<span class="hint"><a class="hint" href="'+href+'">Add a description</a> to help listeners find your music</span>';
		     $('.description .user_description', this.more).append(prompt);
		  }
		}

		// Show mp3 details if admin
		if(window.userIsAdmin){
		  $('.show_to_admin').show();
		}

    // close all other detail panes except currently playing
    var instances = TrackInstances();
    for(var i=0; i < instances.length; i++) {
        if(!instances[i].isPlaying() && this.element != instances[i].element)
          instances[i].closeDetails();
    }

    this.element.addClass('open');

		return;

  },

  closeDetails:function(){
    if(!this.allowDetailsOpen || this.commentBoxIsPopulated()) return false;
    this.more.slideUp({duration:300,queue:false});
    this.element.removeClass('open');
  },

  commentBoxIsPopulated:function(){
    if(this.tabbies &&
      this.tabbies.currentTab == 0 &&
      (this.commentForm != undefined) &&
      ($('textarea',this.more).length > 0) &&
      ($('textarea',this.more).val().length > 1))
        return true;
    else return false;
  },

  isOpen:function(){
    this.more.is(':visible');
  },

  togglePlay: function(target){
    if(this.isPlaying())
      this.pause();
    else
      this.playOrResume();
    // don't follow the link
    return false;
  },

  playOrResume : function(){
    this.killOtherTracks();
    this.seekbar.css('display', 'block');
    this.element.addClass('playing');
    this.innerPlay.addClass('sprites-pause')
    this.innerPlay.removeClass('sprites-play')
    this.openDetails(0);
    this.ensureSoundIsReadyThenPlay();
  },

  tellSoundManagerToPlay: function(){
    this.startTimer();
    if (this.isPaused()){
        // handle the case that we want to play a song that already ended
      if(this.reachedEnd == true){
        this.reachedEnd = false;
        soundManager.stop(this.soundID);
        this.play()
      }else{
        this.resume();
      }
    }else{
      this.play();
    }
  },

  getSound: function() {
    if (!this.sound) {
      var seekbar = this.seekbar.firstAttached(TrackSeekbar);
      this.sound = soundManager.createSound({
        id: this.soundID,
        url: this.trackURL,
        whileloading: $.bind(seekbar.updateLoaded, seekbar),
        whileplaying: $.bind(seekbar.updatePlayed, seekbar),
        onfinish: $.bind(this.startNextTrack, this)
      });
    }
    return this.sound;
  },

  play: function(){
    this.getSound().play();
    if(typeof pageTracker != "undefined"){
      pageTracker._trackPageview(this.trackURL);
    }
  },

  isPlaying: function(){
    return this.element.hasClass('playing');
  },

  pause: function(){
    soundManager.pause(this.soundID);
    this.element.removeClass('playing');
   this.innerPlay.addClass('sprites-play')
    this.innerPlay.removeClass('sprites-pause')

    // this.element.firstChild.removeClass('sprites-play');
    this.closeDetails();
  },

  isPaused: function(){
    if(this.soundIsLoaded()) return true;
    else return false;
  },

  soundIsLoaded: function(){
    if (soundManager.soundIDs.length > 0 && ($.inArray(this.soundID,soundManager.soundIDs) != -1)) return true;
    else return false;
  },

  resume: function(){
    soundManager.resume(this.soundID);
  },

  startNextTrack: function(){
    this.reachedEnd = true;
    // how many tracks are on the page?....
    var instances = TrackInstances();
    if (instances.length > 1) {
      instances[this.nextTrackIndex()].playOrResume();
    } else{
      // ...because we don't want songs on single track page to repeat endlessly
      this.pause();
    }
  },
  startPreviousTrack:function(){
    this.pause();

    var instances = TrackInstances();
    instances[this.previousTrackIndex()].playOrResume();
  },
  previousTrackIndex : function(){
    // index of next Track in Track.instances
    var next = this.trackIndex() - 1;

    // allow us to loop back to the first track
    var instances = TrackInstances();
    if (instances[next] == undefined) next = (instances.length - 1);
    return next;
  },
  nextTrackIndex : function(){
    // index of next Track in Track.instances
    var next = this.trackIndex() + 1;

    // loop back to the first track
    var instances = TrackInstances();
    if (instances[next] == undefined) next = 0;
    return next;
  },

  killOtherTracks : function(){
    // basically a dumb way of making sure no other tracks are playing, looping through
    var instances = TrackInstances();
    for (var track=0; track < instances.length; track++) {
      instances[track].seekbar.css('display', 'none');
      if (instances[track].isPlaying())
        instances[track].pause();
    }
  },

  createTabbies : function(){
    this.tabbies = $(this.more).attachAndReturn(Tabbies)[0]; // low pro returns an array
    this.commentForm = $('.comment_form form',this.more).attachAndReturn(CommentForm)[0];
    $('a.add_to_favorites',this.more).attach(FavoriteToggle);
  },
  startTimer : function(){
    if(this.timer != undefined)
      this.timer.reset();
    else
      this.timer = $.timer(1000,$.bind(this.updateTime,this));
  },
  updateTime : function(){
    this.sound = soundManager.getSoundById(this.soundID);
    if (this.sound != undefined && this.isPlaying()) {
			var time = toTime(this.sound.position);
			if (!time) return;
      this.time.html(time);
      document.title = [time, '-', this.track_title, 'by', this.artist].join(' ');
    }
		return;
		// helpers
		function toTime(pos) {
			var elapsed_time = Math.round(pos / 1000);
			if (isNaN(elapsed_time)) return false;

			var minutes = Math.floor(elapsed_time / 60);
      var seconds = elapsed_time % 60;

      return [minutes, ':', seconds < 10 ? 0 : '', seconds].join('');
		}
  },
  ensureSoundIsReadyThenPlay : function(){
    if(soundIsReady) return this.tellSoundManagerToPlay();
    tryAgain = $.bind(this.ensureSoundIsReadyThenPlay, this); // use lowpro bind to create closure
    setTimeout('tryAgain()','300');
  }
});

TrackInstances = function() { return $('.asset').attached(Track) };


Radio = $.klass({

  initialize : function(){
    this.controls = $('#radio_controls_form',this.element);
    this.currentStation = $('li.selected', this.element);
    this.tracks = $('#radio_tracks');
    this.channelName = $('#channel_name');

    this.bindHoverAndClickStation();
  },

  changeStation : function(newStation){
    newStation = ($(newStation.target).parent('li').length == 0) ? $(newStation.target) : $(newStation.target).parent('li');
    if($('input', newStation).attr('disabled'))
      return false;
    this.currentStation.removeClass('selected');
    $('input',this.currentStation).attr('checked','');
    this.currentStation = newStation.addClass('selected');
    $('input',this.currentStation).attr('checked','checked');
    this.channelName.html($('span.channel_name',this.currentStation).html());
    document.cookie = 'radio='+$('input',this.currentStation).val()+';path=/';
    var url = '/radio/' + $('input',this.currentStation).val();
    document.location = url;

  },

  bindHoverAndClickStation : function(e){
    $('li', this.controls).hover(function() {
        if(!$('input',this).attr('disabled'))
          $(this).addClass('hover');
      }, function() {
        $(this).removeClass('hover');
    });

    $('li', this.controls).click($.bind(this.changeStation, this));
  }
});