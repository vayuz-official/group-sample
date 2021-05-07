import {Utils} from './../../../utils/utils';
import { Base64 } from 'meteor/ostrio:base64';

//import { FlowRouter }      from 'meteor/ostrio:flow-router-extra';
var title = "Volleyball Unite"

function getCorrectHeader(){
  var header = 'header_coach';
    if(Session.get("role") == Utils.getAthleteProfile()){
      header = "header_athlete";
    }else if(Session.get("role") == Utils.getAssociationProfile()){
      header = "association_header";
    }else if(Session.get("role") == Utils.getRefreeProfile()){
      return 'referee_header';
    }else if(Session.get("role") == Utils.getRetiredProfile()){
      return 'retired_header';
    }
    return header;
}

FlowRouter.route('/groups', {
  action: function(params, queryParams) {
    BlazeLayout.render(getCorrectHeader(), {child_template_forntend: 'groups'});
  }, title(params, query, data){
    return  'Group | ' + title;
}
});

FlowRouter.route('/groups/:type', {
  action: function(params, queryParams) {
    BlazeLayout.render(getCorrectHeader(), {child_template_forntend: 'groups_new',groups_card_layout:'groups_card_layout'});
  }, title(params, query, data){
    return  'Groups | ' + title;
}
});

FlowRouter.route('/create-group', {
  action: function(params, queryParams) {
    BlazeLayout.render(getCorrectHeader(), {child_template_forntend: 'create_group_front'});
  }, title(params, query, data){
    return  'Group | ' + title;
}
});

FlowRouter.route('/group-detail/:groupId', {
  action: function(params, queryParams) {
    BlazeLayout.render(getCorrectHeader(), {child_template_forntend: 'group_detail',group_right_panel: 'group_right_panel'});
  }, title(params, query, data){
    return  'Group | ' + title;
}
});

FlowRouter.route('/edit-group/:groupId', {
  action: function(params, queryParams) {
    BlazeLayout.render(getCorrectHeader(), {child_template_forntend: 'edit_group_front'});
  }, title(params, query, data){
    return  'Group | ' + title;
}
});

FlowRouter.route('/discussion-listing/:groupId', {
  action: function(params, queryParams) {
    BlazeLayout.render(getCorrectHeader(), {child_template_forntend: 'discussion_listing', group_right_panel: 'group_right_panel'});
  }, title(params, query, data){
    return  'Discussions | ' + title;
}
});
FlowRouter.route('/discussion-detail/:groupId/:discussionId', {
  action: function(params, queryParams) {
    BlazeLayout.render(getCorrectHeader(), {child_template_forntend: 'discussion_details',
    commenting:'commenting',
    group_right_panel: 'group_right_panel'
  });
  }, title(params, query, data){
    return  'Discussion Detail | ' + title;
}
});