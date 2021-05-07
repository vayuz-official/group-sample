import { PopupUtils } from "../../../../utils/PopupUtils";
import { Utils } from "../../../../utils/utils";
import { GroupUtils } from "./../GroupUtils.js";

import { FeedOperations } from "../../../../utils/FeedOperations";
import {
  Likes,
  LoggedInUser,
  AllDiscussions,
  DiscussionLikes,
} from "../../../../collections/collection";
import { Base64 } from "meteor/ostrio:base64";
const axios = require("axios").default;
import { GroupNetwork } from "./../../../../network/common/groups/GroupNetwork";

Template.discussion_listing.onDestroyed(function () {
  AllDiscussions.remove({});
});

Template.discussion_listing.onRendered(function () {
  Session.set("likeApiCalled", false);
  let gId = Base64.decode(FlowRouter.current().params.groupId);
  var obj = {};
  obj.user_id = Utils.getLoggedInUserId();
  obj.group_id = gId;
  new GroupNetwork()
    .fetchAllGroupsDiscussions(obj)
    .then(function (data) {
      if (data.data.code == 200) {
        for (var i = 0; i < data.data.all_discussions.length; i++) {
          AllDiscussions.insert(data.data.all_discussions[i]);
        }

        setTimeout(function () {
          Utils.loadIconsAndDropdowns();
        }, 1900);
      } else {
        PopupUtils.showErrorPopupWithMessage("Something went wrong");
      }
    })
    .catch(function (e) {
      console.log(e);
      PopupUtils.showErrorPopupWithMessage("Something went wrong");
    });
});

Template.discussion_listing.helpers({
  like_api_called: function () {
    return Session.get("likeApiCalled");
  },
  fetch_group_discussion_based_on_group_id: function () {
    let groupId = FlowRouter.current().params.groupId;
    let gId = Base64.decode(groupId);
    var groupDiscussionWithUser = AllDiscussions.find(
      {
        group_id: gId,
        is_active: true,
      },
      {
        sort: {
          created_at: -1,
        },
      }
    ).fetch();
    console.log(groupDiscussionWithUser);
    return groupDiscussionWithUser;
  },
  check_if_user_liked: function (group_discussion_id) {
    Meteor.subscribe(
      "check_if_user_liked",
      Utils.getLoggedInUserId(),
      group_discussion_id
    );
    var obj = {};
    obj.post_id = group_discussion_id;
    obj.is_active = true;
    obj.user_id = Utils.getLoggedInUserId();
    return Likes.find(obj).count() > 0;
  },
});

Template.discussion_listing.events({
  "keyup #title": function (event) {
    event.preventDefault();
    // alert("Keyup")
    if ($("#title").val().trim() == "" || $("#details").val().trim() == "") {
      $("#post_comment_loader").addClass("is-disabled");
    } else {
      $("#post_comment_loader").removeClass("is-disabled");
    }
  },
  "keyup #details": function (event) {
    event.preventDefault();
    // alert("Keyup")
    if ($("#title").val().trim() == "" || $("#details").val().trim() == "") {
      // document.getElementById('post_comment_loader').disabled =true;
      $("#post_comment_loader").addClass("is-disabled");
    } else {
      $("#post_comment_loader").removeClass("is-disabled");
    }
  },
  "click .close-modal": function (event) {
    event.preventDefault();
    $("#delete-post-modal").removeClass("is-active");
    $("#all_likes_modal").removeClass("is-active");
  },
  "click .modal-background": function (event) {
    event.preventDefault();
    $("#delete-post-modal").removeClass("is-active");
    $("#report_abuse-modal").removeClass("is-active");
    $("#all_likes_modal").removeClass("is-active");
    $("#total-members").removeClass("is-active");
    $("#invite-members").removeClass("is-active");
  },
  "click #report_discussion_abusive": function (event) {
    event.preventDefault();
    $("#report_abuse-modal").addClass("is-active");
    Session.set("reportedFeedPostId", this.group_discussion_id);
    Session.set("reportedPostType", "discussion");
  },
  "click .edit_discussion1": function (event) {
    event.preventDefault();
    $("#hidden_div_" + this.group_discussion_id).removeClass("display_hidden");
    $("#visible_final_div_" + this.group_discussion_id).addClass(
      "display_hidden"
    );
  },
  "click .cancel_editing": function (event) {
    event.preventDefault();
    $("#hidden_div_" + this.group_discussion_id).addClass("display_hidden");
    $("#visible_final_div_" + this.group_discussion_id).removeClass(
      "display_hidden"
    );
  },
  "click .update_discussion": function (event) {
    event.preventDefault();

    var details = $("#discussion_description_" + this.group_discussion_id)
      .val()
      .trim();
    if (details == "") {
      $("#invalid_desc").removeClass("display_hidden");
      return false;
    } else {
      if (!$("#invalid_desc").hasClass("display_hidden"))
        $("#invalid_desc").addClass("display_hidden");
    }

    var obj = {};
    obj.group_discussion_id = this.group_discussion_id;

    obj.user_id = Utils.getLoggedInUserId();
    obj.details = details;
    $("#remove_post_loader_" + obj.group_discussion_id).removeClass(
      "display_hidden"
    );

    console.log("obj", obj);
    axios
      .post(Utils.getUrl() + "update_discussion", obj)
      .then(function (response) {
        console.log(response);
        // handle success
        $("#remove_post_loader_" + obj.group_discussion_id).addClass(
          "display_hidden"
        );

        if (response.data.code == 200) {
          // toastr.success(response.data.message);
          PopupUtils.showSuccessPopup(response.data.message);
          AllDiscussions.update(
            {
              group_discussion_id: obj.group_discussion_id,
            },
            {
              $set: {
                details: details,
              },
            }
          );
          $("#hidden_div_" + obj.group_discussion_id).addClass(
            "display_hidden"
          );
          $("#visible_final_div_" + obj.group_discussion_id).removeClass(
            "display_hidden"
          );
        } else {
          PopupUtils.showErrorPopupWithMessage(response.data.message);
        }
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      })
      .then(function () {});
  },
  "click .discussion_detail,.comment": function (event) {
    event.preventDefault();
    let id = this.group_discussion_id;
    let gpId = FlowRouter.current().params.groupId;
    Session.setPersistent("group_discussion_id", id);
    window.location.href =
      "/discussion-detail/" + gpId + "/" + Utils.encodeString(id);
  },
  "click #like_comment_event": function (event) {
    event.preventDefault();
    if (Session.get("likeApiCalled") == false) {
      var obj = {};
      obj.user_id = Utils.getLoggedInUserId();
      obj.post_id = this.group_discussion_id;
      obj.post_type = "discussion";
      obj.liked =
        !Likes.find({
          post_id: this.group_discussion_id,
          is_active: true,
        }).count() > 0;
      Session.set("likeApiCalled", true);
      FeedOperations.likeEventOnDiscussions(obj);
    }
  },
  "click #like_count": async function (event) {
    event.preventDefault();
    event.stopPropagation();
    if(this.is_creator.length==0){
      // PopupUtils.showSuccessPopup("Only Creator can check the users who have liked this post");
    }else{
      if(this.total_likes>=0){
        let gId = Base64.decode(FlowRouter.current().params.groupId);
        var obj = {};
        obj.user_id = Utils.getLoggedInUserId();
        obj.discussion_id = this.group_discussion_id;
        obj.group_id = gId;
        DiscussionLikes._collection.remove({});
        var result = await new GroupNetwork().fetchAllDiscussionLikes(obj);
      
        if (result.data.code == 200) {
          for (var i = 0; i < result.data.all_likes.length; i++) {
            DiscussionLikes.insert(result.data.all_likes[i].user_details[0]);
          }
          $("#all_likes_modal").addClass("is-active");
        } else {
          PopupUtils.showErrorPopupWithMessage("Something went wrong");
        }
      }
    }
    
  },
  "click .post_comment": async function (event) {
    event.preventDefault();
    var title = $("#title").val().trim();
    if (title == "") {
      $("#invalid_title").removeClass("display_hidden");
      return false;
    } else {
      if (!$("#invalid_title").hasClass("display_hidden"))
        $("#invalid_title").addClass("display_hidden");
    }

    var details = $("#details").val().trim();
    if (details == "") {
      $("#invalid_desc").removeClass("display_hidden");
      return false;
    } else {
      if (!$("#invalid_desc").hasClass("display_hidden"))
        $("#invalid_desc").addClass("display_hidden");
    }

    var obj = {};
    obj.group_id = getGroupId();
    obj.title = title;
    obj.user_id = Utils.getLoggedInUserId();
    obj.details = details;
    $("#post_comment_loader").removeClass("display_hidden");
    $("#loader").removeClass("display_hidden");

    axios
      .post(Utils.getUrl() + "create_discussion", obj)
      .then(function (response) {
        console.log(response);
        $("#loader").addClass("display_hidden");
        if (response.data.code == 200) {
          var userData = LoggedInUser.find({
            user_id: Utils.getLoggedInUserId(),
          }).fetch();
          response.data.discussion_details.Data = userData;
          response.data.discussion_details.total_comments = 0;
          response.data.discussion_details.total_likes = 0;
          response.data.discussion_details.is_creator = [{"1_id":"true"}];

          response.data.discussion_details.is_follower = [];
          response.data.discussion_details.is_following = [];
          AllDiscussions.insert(response.data.discussion_details);
          new GroupUtils().updateDiscussionCount(getGroupId(), true);
          $("#title").val("");
          $("#details").val("");
          $("#post_comment_loader").addClass("is-disabled");
          setTimeout(function () {
            Utils.loadDropdowns();
          }, 2000);
        }
      })
      .catch(function (error) {
        console.log(error);
      });
  },
  "click .delete_discussion": async function (event) {
    event.preventDefault();
    $("#delete-post-modal").addClass("is-active");
    Session.set("deletingDiscussionId", this.group_discussion_id);
  },
  "click #confirm_post_removal": function (event) {
    event.preventDefault();
    var obj = {};
    obj.group_id = getGroupId();
    obj.group_discussion_id = Session.get("deletingDiscussionId");
    obj.user_id = Utils.getLoggedInUserId();
    $("#remove_post_loader").removeClass("display_hidden");
    axios
      .post(Utils.getUrl() + "delete_discussion", obj)
      .then(function (response) {
        console.log(response);
        if (response.data.code == 200) {
          $("#remove_post_loader").addClass("display_hidden");
          $("#delete-post-modal").removeClass("is-active");
          AllDiscussions.remove({
            group_discussion_id: obj.group_discussion_id,
          });
          new GroupUtils().updateDiscussionCount(getGroupId(), false);
          PopupUtils.showSuccessPopup(response.data.message);

          // toastr.success(response.data.message);
        } else {
          $("#delete-post-modal").removeClass("is-active");
          PopupUtils.showErrorPopupWithMessage(response.data.message);
          // toastr.warning(response.data.message);
        }
      })
      .catch(function (error) {
        console.log(error);
      });
  },
});

function getGroupId() {
  return Base64.decode(FlowRouter.current().params.groupId);
}
