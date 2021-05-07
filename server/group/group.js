import { Meteor } from "meteor/meteor";
import express from "express";
import { SSR, Template } from "meteor/meteorhacks:ssr";
import { WebApp } from "meteor/webapp";
import md5 from "md5";
var Fiber = require("fibers");
import { HTTP } from "meteor/http";
import { Utils } from "../../../utils/utils.js";
import {
  Likes,
  Group,
  User,
  Notifications,
  UserComments,
  AbusivePosts,
  GroupMember,
  Followers,
  GroupDiscussion,
  Feed,
} from "./../../../collections/collection.js";
import { NotificationSender } from "../../NotificationSender.js";

const app = express();
//  const Util = require('../serverUtil/util');
// const util = new Util();
app.use(express.json());
app.post("/fetch_all_groups_count", (req, res) => {
  let user_id = req.body.user_id;
  let query = req.body.query;
  Fiber(async function () {
    var result = {};
    var allGroups = [];
    query = new RegExp(query, "i");

    // if(type == 'all'){
    var allGroupMembers = GroupMember.find({
      user_id: user_id,
      status: { $nin: [0, 2] },
    }).fetch();
    for (var i = 0; i < allGroupMembers.length; i++) {
      allGroups.push(allGroupMembers[i].group_id);
    }
    var allGroupsCreatedByUser = Group.find({
      created_by: user_id,
      is_active: true,
    }).fetch();
    for (var i = 0; i < allGroupsCreatedByUser.length; i++) {
      allGroups.push(allGroupsCreatedByUser[i].group_id);
    }

    var checkAllAbusivePosts = AbusivePosts.find({
      $or: [
        {
          user_id: user_id,
          post_type: "group",
          status: { $in: [0, 1] },
        },
        {
          post_type: "group",
          status: {
            $in: [1],
          },
        },
      ],
    }).fetch();
    var allAbusivePosts = [];
    for (var i = 0; i < checkAllAbusivePosts.length; i++) {
      allAbusivePosts.push(checkAllAbusivePosts[i].post_id);
    }
    response = Promise.await(
      Group.rawCollection()
        .aggregate([
          {
            $match: {
              $and: [
                { is_active: true },
                { group_id: { $in: allGroups } },
                { group_id: { $nin: allAbusivePosts } },
                { group_name: query },
              ],
            },
          },
          {
            $lookup: {
              from: "user",
              localField: "created_by",
              foreignField: "user_id",
              as: "user_data",
            },
          },
          {
            $sort: {
              created_at: -1,
            },
          },
        ])
        .toArray()
    );

    result.all_groups = response.length;

    allGroups = [];
    var allGroupMembers = GroupMember.find({
      user_id: user_id,
      status: 0,
    }).fetch();
    for (var i = 0; i < allGroupMembers.length; i++) {
      allGroups.push(allGroupMembers[i].group_id);
    }

    response = Promise.await(
      Group.rawCollection()
        .aggregate([
          {
            $match: {
              $and: [
                { is_active: true },
                { group_id: { $in: allGroups } },
                { group_id: { $nin: allAbusivePosts } },
                { group_name: query },
              ],
            },
          },
          {
            $lookup: {
              from: "user",
              localField: "created_by",
              foreignField: "user_id",
              as: "user_data",
            },
          },
          {
            $sort: {
              created_at: -1,
            },
          },
        ])
        .toArray()
    );

    result.all_pending = response.length;
    allGroups = [];
    var allGroupsCreatedByUser = Group.find({
      created_by: user_id,
      is_active: true,
    }).fetch();
    for (var i = 0; i < allGroupsCreatedByUser.length; i++) {
      allGroups.push(allGroupsCreatedByUser[i].group_id);
    }

    response = Promise.await(
      Group.rawCollection()
        .aggregate([
          {
            $match: {
              $and: [
                { is_active: true },
                { group_id: { $in: allGroups } },
                { group_id: { $nin: allAbusivePosts } },
                { group_name: query },
              ],
            },
          },
          {
            $lookup: {
              from: "user",
              localField: "created_by",
              foreignField: "user_id",
              as: "user_data",
            },
          },
          {
            $sort: {
              created_at: -1,
            },
          },
        ])
        .toArray()
    );

    result.all_created_by_me = response.length;
    // console.log(result);
    return res.status(200).send(result);
  }).run();
});

app.post("/update_discussion", (req, res) => {
  // console.log("req.body", req.body);
  let user_id = req.body.user_id;
  let group_discussion_id = req.body.group_discussion_id;

  Fiber(function () {
    let data = GroupDiscussion.find({
      group_discussion_id: group_discussion_id,
    }).fetch();
    let result = {};
    if (data.length > 0) {
      var details = {
        //  title : req.body.title ,
        details: req.body.details,
        updated_at: Date.now(),
      };

      GroupDiscussion.update(
        { group_discussion_id: group_discussion_id },
        { $set: details }
        //  {multi:true}
      );
      result.code = 200;
      result.message = "Discussion Updated";
      return res.status(200).send(result);
    } else {
      result.code = 900;
      result.message = "Group discussion not exists.";
      return res.status(200).send(result);
    }
  }).run();
});
app.post("/create_discussion", (req, res) => {
  // console.log("req.body", req.body);
  let user_id = req.body.user_id;
  let group_id = req.body.group_id;

  Fiber(function () {
    let data = User.find({ user_id: user_id }).fetch();
    let result = {};
    var details = {
      group_discussion_id: "group_discussion_id_" + Date.now(),
      group_id: req.body.group_id,
      discussion_for: data[0].user_type,
      created_by: user_id,
      title: req.body.title,
      details: req.body.details,
      is_active: true,
      created_at: Date.now(),
    };

    GroupDiscussion.insert(details);
    var obj = {};
    obj.user_id = user_id;
    obj.post_id = details.group_id; // POST ID
    obj.notification_type = "NEW_DISCUSSION_CREATED";
    new NotificationSender().bindNotification(obj);

    result.code = 200;
    result.discussion_details = details;
    result.message = "Group discussion created successfully.";
    return res.status(200).send(result);
  }).run();
});
app.post("/create_group_frontend", (req, res) => {
  // console.log("req.body", req.body);
  let user_id = req.body.user_id;
  let url = req.body.cover_image;
  Fiber(function () {
    let blogData = Group.find({ group_name: req.body.title }).fetch();
    // console.log("blogData", blogData);
    if (blogData.length == 0) {
      let data = User.find({ user_id: user_id }).fetch();
      let result = {};
      if (data.length != 0) {
        if (data[0].email_status === false) {
          result.code = 200;
          result.message =
            "Your email is not verified. Please verify your email.";
          return res.status(200).send(result);
        }
      }

      var group_id = "group_id_" + Date.now();
      var details = {
        group_id: group_id,
        group_for: data[0].user_type,
        created_by: user_id,
        group_name: req.body.title,
        group_description: req.body.description,
        cover_image: req.body.cover_image,
        is_active: true,
        created_at: Date.now(),
      };
      for (var i = 0; i < req.body.invited_users.length; i++) {
        let obj = {
          group_member_id: "GROUP_MEMBER_ID_" + (Date.now() + i),
          group_id: group_id,
          created_by: user_id,
          user_id: req.body.invited_users[i],
          status: 0, //0 -> Not accepted, 1 -> Accepted, 2-> Rejected
          created_at: Date.now(),
        };
        GroupMember.insert(obj);
        var obj2 = {};
        obj2.invited_user_id = req.body.invited_users[i];
        obj2.group_id = group_id;
        obj2.group_creator = user_id;
        obj2.user_id = user_id;
        obj2.notification_type = "GROUP_INVITE";
        new NotificationSender().bindNotification(obj2);
      }

      obj = {
        group_member_id: "GROUP_MEMBER_ID_" + (Date.now() + i),
        group_id: group_id,
        created_by: user_id,
        user_id: user_id,
        status: 1, //0 -> Not accepted, 1 -> Accepted, 2-> Rejected
        created_at: Date.now(),
      };
      GroupMember.insert(obj);

      Group.insert(details);
      
      result.code = 200;
      result.message = "Group created";
      return res.status(200).send(result);
    } else {
      var result = {};
      result.code = 404;
      result.message = "Group Name already exists.";
      return res.status(200).send(result);
    }
  }).run();
});

app.post("/remove_group", (req, res) => {
  Fiber(async function () {
    // console.log(req.body);
    var user_id = req.body.user_id;
    var group_id = req.body.group_id;
    var result = {};
    var query = {
      group_id: group_id,
      created_by: user_id,
      // is_active:true
    };
    var checkIfExists = Group.find(query).fetch();
    if (checkIfExists.length == 0) {
      result.code = 300;
      result.message = "Such group not found.";
    } else if (checkIfExists.length != 0) {
      // Feed.update(
      //   { group_id: group_id },
      //   { $set: { is_active: false, updated_at: Date.now() } }
      // );
      Group.update(query, {
        $set: { is_active: false, updated_at: Date.now() },
      });
      result.code = 200;
      result.message = "Group deleted Successfully.";
    }

    return res.status(200).send(result);
  }).run();
});

app.post("/delete_discussion", (req, res) => {
  Fiber(async function () {
    // console.log(req.body);
    var user_id = req.body.user_id;
    var group_id = req.body.group_id;
    var group_discussion_id = req.body.group_discussion_id;
    var is_active = false;
    var result = {};

    var query = {
      group_discussion_id: group_discussion_id,
      created_by: user_id,
    };
    var blog = GroupDiscussion.find(query).fetch();
    // // console.log(blog)
    if (blog.length == 0) {
      result.code = 200;
      result.message = "Such group discussion not found.";
    } else if (blog.length != 0) {
      var isActive = is_active;
      GroupDiscussion.update(query, {
        $set: { is_active: isActive, last_updated_at: Date.now() },
      });
      result.code = 200;
      result.message = "Group discussion deleted!";
    }

    return res.status(200).send(result);
  }).run();
});

app.post("/update_group_frontend", (req, res) => {
  Fiber(async function () {
    // console.log(req.body);
    var user_id = req.body.user_id;
    var group_id = req.body.id;

    var result = {};

    var query = {
      group_id: group_id,
      created_by: user_id,
    };
    var blog = Group.find(query).fetch();
    // console.log(blog);
    if (blog.length == 0) {
      result.code = 300;
      result.message = "Such group not found.";
    } else if (blog.length != 0) {
      let obj = {
        group_name: req.body.title,
        group_description: req.body.description,
        cover_image: req.body.cover_image,
        last_updated_at: Date.now(),
      };
      Group.update(query, { $set: obj });

      // var allGroupMembers = GroupMember.find({"group_id":group_id}).fetch();
      // // console.log("Old Users Found:" + allGroupMembers.length);
      // for(var i=0;i<allGroupMembers.length;i++){
      //   GroupMember.remove({group_member_id:allGroupMembers[i].group_member_id});
      // }
      // var allGroupMembers = GroupMember.find({"group_id":group_id}).fetch();
      // // console.log("After Delete");
      // // console.log("Old Users Found:" + allGroupMembers.length);
      for (var i = 0; i < req.body.invited_users.length; i++) {
        let data = GroupMember.find({
          group_id: group_id,
          created_by: user_id,
          user_id: req.body.invited_users[i],
        }).fetch();
        if (data.length == 0) {
          let obj = {
            group_member_id: "GROUP_MEMBER_ID_" + (Date.now() + i),
            group_id: group_id,
            created_by: user_id,
            user_id: req.body.invited_users[i],
            status: 0, //0 -> Not accepted, 1 -> Accepted, 2-> Rejected
            created_at: Date.now(),
          };
          GroupMember.insert(obj);

          var obj2 = {};
          obj2.invited_user_id = req.body.invited_users[i];
          obj2.group_id = group_id;
          obj2.group_creator = user_id;
          obj2.user_id = user_id;
          obj2.notification_type = "GROUP_INVITE";
          new NotificationSender().bindNotification(obj2);
        }
      }

      result.code = 200;
      result.message = "Group details updated !";
    }

    return res.status(200).send(result);
  }).run();
});

app.post("/check_if_user_is_member_of_group", (req, res) => {
  Fiber(async function () {
    // console.log(req.body);
    let gId = req.body.group_id;
    let loginUserId = req.body.user_id;
    let result = {};
    let group = Group.find({ group_id: gId }).fetch();
    let groupCreatedBy = group[0].created_by;
    // console.log("groupCreatedBy", groupCreatedBy, loginUserId);
    var checkIfCreator = Group.find({
      group_id: gId,
      created_by: loginUserId,
    }).fetch();
    if (checkIfCreator.length != 0) {
      result.code = 200;
      result.is_member = true;
      result.message = "You are member of this group.";
      return res.status(200).send(result);
    }
    var checkIfAlreadyFollower = Followers.find({
      $or: [
        { user_id: groupCreatedBy, is_active: true, follower_of: loginUserId },
        { user_id: loginUserId, is_active: true, follower_of: groupCreatedBy },
      ],
    }).fetch();
    //// console.log("checkIfAlreadyFollower",checkIfAlreadyFollower);
    if (checkIfAlreadyFollower.length > 0) {
      let data = GroupMember.find({
        group_id: gId,
        status: 1,
        user_id: { $in: [req.body.user_id] },
      }).fetch();
      // // console.log("data",data);
      if (data.length > 0) {
        result.code = 200;
        result.is_member = true;
        result.message = "You are member of this group.";
      } else {
        result.code = 200;
        result.is_member = false;
        result.message = "You are not member of this group.";
      }
    } else {
      result.code = 900;
      result.message =
        "You need to unite first then can join  or start discussion";
    }
    return res.status(200).send(result);
  }).run();
});

app.post("/joinGroup", (req, res) => {
  Fiber(async function () {
    //// console.log(req.body);

    let gId = req.body.group_id;
    let loginUserId = req.body.loginUserId;
    let result = {};

    let user = User.find({ user_id: loginUserId }).fetch();
    if (
      user[0] &&
      (user[0].user_type == "ATHLETE" || user[0].user_type == "COACH")
    ) {
      let group = Group.find({ group_id: gId }).fetch();
      let groupCreatedBy = group[0].created_by;
      //// console.log("groupCreatedBy",groupCreatedBy,loginUserId);
      var checkIfAlreadyFollower = Followers.find({
        $or: [
          {
            user_id: groupCreatedBy,
            is_active: true,
            follower_of: loginUserId,
          },
          {
            user_id: loginUserId,
            is_active: true,
            follower_of: groupCreatedBy,
          },
        ],
      }).fetch();

      // // console.log("checkIfAlreadyFollower",checkIfAlreadyFollower);

      if (checkIfAlreadyFollower.length > 0) {
        let data = GroupMember.find({
          group_id: gId,
          user_id: { $in: [req.body.loginUserId] },
        }).fetch();
        // console.log("data", data);
        if (data.length > 0) {
          result.code = 200;
          result.is_member = true;
          result.message = "You are already member of this group.";
        } else {
          let obj = {
            group_id: gId,
            user_id: loginUserId,
            is_active: true,
            created_at: Date.now(),
            group_member_id: "GROUP_MEMBER_ID_" + Date.now(),
          };
          GroupMember.insert(obj);

          result.code = 200;
          result.is_member = true;
          result.message = "You are now member of this group.";
        }
      } else {
        result.code = 900;
        result.message =
          "You need to unite first then can join  or start discussion";
      }
      return res.status(200).send(result);
    } else {
      result.code = 700;
      result.message = "Only Athlete or coach can join the group";
    }
    return res.status(200).send(result);
  }).run();
});

app.post("/inviteSentForJoinGroup", (req, res) => {
  Fiber(async function () {
    // console.log(req.body);

    let group_id = req.body.group_id;
    let user_id = req.body.user_id;
    let UserIdArray = req.body.invited_users;
    let result = {};

    for (var i = 0; i < UserIdArray.length; i++) {
      let data = GroupMember.find({
        group_id: group_id,
        user_id: UserIdArray[i],
        status: 0,
      }).fetch();
      if (data.length > 0) {
        result.code = 200;
        result.is_member = true;
        result.message = "You are already member of this group.";
      } else {
        let obj = {
          group_member_id: "GROUP_MEMBER_ID_" + (Date.now() + i),
          group_id: group_id,
          user_id: UserIdArray[i],
          created_by: user_id,
          status: 0,
          created_at: Date.now(),
        };
        GroupMember.insert(obj);
        var obj2 = {};
        obj2.invited_user_id = UserIdArray[i];
        obj2.group_id = group_id;
        obj2.group_creator = user_id;
        obj2.user_id = user_id;
        obj2.notification_type = "GROUP_INVITE";
        new NotificationSender().bindNotification(obj2);
      }
    }

    result.code = 200;
    result.is_member = true;
    result.message = "People invited to this group.";
    return res.status(200).send(result);
  }).run();
});

app.post("/fetch_all_user_connections_count", (req, res) => {
  Fiber(function () {
    var userId = req.body.user_id;
    var allFollowers = Followers.find(
      {
        $and: [
          { $or: [{ follower_of: userId }, { user_id: userId }] },
          { is_active: true },
          { status: 1 },
          { user_type: Utils.getGenericUserType() },
        ],
      },
      { sort: { created_at: -1 } }
    ).count();

    var result = {};
    result.code = 200;
    result.connections = allFollowers;
    return res.status(200).send(result);
  }).run();
});
app.post("/fetch_all_user_connections", (req, res) => {
  Fiber(function () {
    var userId = req.body.user_id;

    var allFollowers = Followers.find(
      {
        $and: [
          { $or: [{ follower_of: userId }, { user_id: userId }] },
          { is_active: true },
          { status: 1 },
          { user_type: Utils.getGenericUserType() },
        ],
      },
      { sort: { created_at: -1 } }
    ).fetch();
    // console.log("allFollowers");
    // console.log(allFollowers);
    // console.log(allFollowers.el);
    var allUsersData = [];
    for (var i = 0; i < allFollowers.length; i++) {
      var userIdToCheck = allFollowers[i].user_id;
      if (userId == allFollowers[i].user_id) {
        userIdToCheck = allFollowers[i].follower_of;
      }
      // console.log("userIdToCheckuserIdToCheck");
      // console.log(userIdToCheck);
      if (req.body.user_type_provided) {
        var q = {
          user_id: userIdToCheck,
          user_type: { $in: req.body.user_type },
        };
        // console.log(q);
        var totalUsers = User.find(q).fetch();
      } else {
        var totalUsers = User.find({
          user_id: { $ne: userIdToCheck },
          user_id: userIdToCheck,
        }).fetch();
      }
      
      if (totalUsers.length != 0) {
        var data = {};
        data._id = totalUsers[0]._id;
        data.user_type = totalUsers[0].user_type;
        data.user_id = totalUsers[0].user_id;
        data.name = totalUsers[0].name;
        data.profile_picture = totalUsers[0].profile_picture;
        data.province = totalUsers[0].province;
        data.city = totalUsers[0].city;
        data.req_status = allFollowers[i].status;
        data.follower_id = allFollowers[i].follower_id;

        if (totalUsers[0].other_details) {
          data.other_details = totalUsers[0].other_details;
        }
        if (totalUsers[0].school_name) {
          data.school_name = totalUsers[0].school_name;
        } else if (totalUsers[0].club_name) {
          data.club_name = totalUsers[0].club_name;
        } else if (totalUsers[0].institute_name) {
          data.institute_name = totalUsers[0].institute_name;
        }

        if (allFollowers[i].status == 1) {
          data.request_sent_by_me = false;
          allUsersData.push(data);
        }
      }
    }
    // console.log(allUsersData);
    allUsersData.sort(function (a, b) {
      return a.created_at > b.created_at;
    });
    var result = {};
    result.code = 200;
    result.data = allUsersData;
    return res.status(200).send(result);
  }).run();
});

app.post("/leave_group", (req, res) => {
  Fiber(async function () {
    let group_id = req.body.group_id;
    let user_id = req.body.user_id;
    var checkIfMember = GroupMember.find({
      group_id: group_id,
      user_id: user_id,
      status: 1,
    }).fetch();
    if (checkIfMember.length != 0) {
      let data = GroupMember.remove({ group_id: group_id, user_id: user_id }); // .fetch();
      var result = {};
      result.code = 200;
      result.message = "You are member of this group.";
    } else {
      result.code = 300;
      result.is_member = false;
      result.message = "Something went wrong, please try again.";
    }

    return res.status(200).send(result);
  }).run();
});

function getTotalGroups(type, allGroups, allAbusivePosts, query) {
  if (type == "all") {
    response = Promise.await(
      Group.rawCollection()
        .aggregate([
          {
            $match: {
              $and: [
                { is_active: true },
                { group_id: { $in: allGroups } },
                { group_id: { $nin: allAbusivePosts } },
                { group_name: query },
              ],
            },
          },
          {
            $lookup: {
              from: "user",
              localField: "created_by",
              foreignField: "user_id",
              as: "user_data",
            },
          },
          {
            $sort: {
              created_at: -1,
            },
          },
        ])
        .toArray()
    );
  } else if ("pending" == type) {
    response = Promise.await(
      Group.rawCollection()
        .aggregate([
          {
            $match: {
              $and: [
                { is_active: true },
                { group_id: { $in: allGroups } },
                { group_id: { $nin: allAbusivePosts } },
                { group_name: query },
              ],
            },
          },
          {
            $lookup: {
              from: "user",
              localField: "created_by",
              foreignField: "user_id",
              as: "user_data",
            },
          },
          {
            $sort: {
              created_at: -1,
            },
          },
        ])
        .toArray()
    );
  } else {
    response = Promise.await(
      Group.rawCollection()
        .aggregate([
          {
            $match: {
              $and: [
                { is_active: true },
                { group_id: { $in: allGroups } },
                { group_id: { $nin: allAbusivePosts } },
                { group_name: query },
              ],
            },
          },
          {
            $lookup: {
              from: "user",
              localField: "created_by",
              foreignField: "user_id",
              as: "user_data",
            },
          },
          {
            $sort: {
              created_at: -1,
            },
          },
        ])
        .toArray()
    );
  }
  return response.length;
}

app.post("/fetch_all_groups", (req, res) => {
  let user_id = req.body.user_id;
  let type = req.body.type;
  let query = req.body.query;
  Fiber(async function () {
    //Fetch All User Id from Network (Or Fetch ALL Groups where I am invited or created by me)
    var allGroups = [];
    if (type == "all") {
      var allGroupMembers = GroupMember.find({
        user_id: user_id,
        status: { $nin: [0, 2] },
      }).fetch();
      for (var i = 0; i < allGroupMembers.length; i++) {
        allGroups.push(allGroupMembers[i].group_id);
      }
      var allGroupsCreatedByUser = Group.find({
        created_by: user_id,
        is_active: true,
      }).fetch();
      for (var i = 0; i < allGroupsCreatedByUser.length; i++) {
        allGroups.push(allGroupsCreatedByUser[i].group_id);
      }
    } else if (type == "pending") {
      var allGroupMembers = GroupMember.find({
        user_id: user_id,
        status: 0,
      }).fetch();
      for (var i = 0; i < allGroupMembers.length; i++) {
        allGroups.push(allGroupMembers[i].group_id);
      }
    } else if (type == "by_me") {
      var allGroupsCreatedByUser = Group.find({
        created_by: user_id,
        is_active: true,
      }).fetch();
      for (var i = 0; i < allGroupsCreatedByUser.length; i++) {
        allGroups.push(allGroupsCreatedByUser[i].group_id);
      }
    }
    // console.log(allGroups);

    query = new RegExp(query, "i");

    var limit = req.body.limit;
    // console.log("LIMIT" + limit);
    var max = 0;
    if (limit == undefined) {
      limit = 0;
      max = 1000;
    } else {
      max = 8;
    }

    var checkAllAbusivePosts = AbusivePosts.find({
      $or: [
        {
          user_id: user_id,
          post_type: "group",
          status: { $in: [0, 1] },
        },
        {
          post_type: "group",
          status: {
            $in: [1],
          },
        },
      ],
    }).fetch();
    var allAbusivePosts = [];
    for (var i = 0; i < checkAllAbusivePosts.length; i++) {
      allAbusivePosts.push(checkAllAbusivePosts[i].post_id);
    }

    await Group.rawCollection()
      .aggregate([
        {
          $match: {
            $and: [
              { is_active: true },
              { group_id: { $in: allGroups } },
              { group_id: { $nin: allAbusivePosts } },
              { group_name: query },
            ],
          },
        },
        {
          $lookup: {
            from: "user",
            localField: "created_by",
            foreignField: "user_id",
            as: "user_data",
          },
        },
        {
          $sort: {
            created_at: -1,
          },
        },
        {
          $limit: max + limit,
        },
        {
          $skip: limit,
        },
      ])
      .toArray()
      .then(function (finalGroups) {
        var result = {};
        result.code = 200;
        result.all_groups = finalGroups;
        result.message = "All Groups Fetched.";

        result.total_groups = getTotalGroups(
          type,
          allGroups,
          allAbusivePosts,
          query
        );

        return res.status(200).send(result);
      });
  }).run();
});

app.post("/changeInviteStatus", (req, res) => {
  Fiber(async function () {
    //// console.log(req.body);

    let gId = req.body.group_id;
    let user_id = req.body.user_id;
    let status = req.body.status;
    let created_by = req.body.created_by;
    let result = {};
    let data = GroupMember.update(
      { group_id: gId, user_id: user_id, created_by: created_by },
      {
        $set: {
          status: parseInt(status),
        },
      }
    );
    var checkIfNotificationExists = Notifications.find({
      notification_type: "GROUP_INVITE",
      notification_to: user_id,
      "notification_details.group_id": gId,
    }).fetch();

    // console.log(data);
    // console.log("data");
    // console.log("checkIfNotificationExists");
    // console.log(checkIfNotificationExists);
    if (checkIfNotificationExists.length != 0) {
      Notifications.update(
        {
          notification_id: checkIfNotificationExists[0].notification_id,
        },
        {
          $set: {
            is_read: true,
            action_taken: true,
            "notification_details.invite_accepted": parseInt(status) == 1,
            updated_at: Date.now(),
          },
        }
      );
    }

    if (data) {
      var obj = {};
      obj.user_id = user_id;
      obj.group_id = gId;
      obj.status = parseInt(status);
      obj.notification_type = "GROUP_INVITE_ACCCEPT_OR_REJECT";
      new NotificationSender().bindNotification(obj);

      result.code = 200;
      result.message = "Successfully updated";
    } else {
      result.code = 300;
      result.message = "Something went wrong";
    }
    return res.status(200).send(result);
  }).run();
});

app.post("/fetch_group_details_based_on_id", (req, res) => {
  Fiber(async function () {
    //// console.log(req.body);

    let gId = req.body.group_id;
    let user_id = req.body.user_id;
    await Group.rawCollection()
      .aggregate([
        {
          $match: {
            $and: [{ is_active: true }, { group_id: gId }],
          },
        },
        {
          $lookup: {
            from: "user",
            localField: "created_by",
            foreignField: "user_id",
            as: "Data",
          },
        },
        {
          $lookup: {
            from: "groupMember",
            localField: "group_id",
            foreignField: "group_id",
            as: "all_members",
          },
        },
        {
          $sort: {
            created_at: -1,
          },
        },
      ])
      .toArray()
      .then(function (data) {
        for (var i = 0; i < data.length; i++) {
          for (var j = 0; j < data[i].all_members.length; j++) {
            var user_details = User.find({
              user_id: data[i].all_members[j].user_id,
            }).fetch();
            // console.log(data[i].all_members[j].user_id);
            if (user_details) {
              data[i].all_members[j].user_details = user_details;
            }
          }
          data[i].total_discussions = GroupDiscussion.find({
            group_id: data[i].group_id,
            is_active: true,
          }).count();
        }

        var result = {};
        result.code = 200;
        result.group_details = data;

        return res.status(200).send(result);
      });
  }).run();
});

app.post("/fetch_all_group_discussions", (req, res) => {
  Fiber(async function () {
    let gId = req.body.group_id;
    let user_id = req.body.user_id;

    var checkAllAbusivePosts = AbusivePosts.find({
      $or: [
        {
          user_id: user_id,
          post_type: "discussion",
          status: { $in: [0, 1] },
        },
        {
          post_type: "discussion",
          status: {
            $in: [1],
          },
        },
      ],
    }).fetch();
    var allAbusivePosts = [];
    for (var i = 0; i < checkAllAbusivePosts.length; i++) {
      allAbusivePosts.push(checkAllAbusivePosts[i].post_id);
    }

    GroupDiscussion.rawCollection()
      .aggregate([
        {
          $match: {
            $and: [
              { is_active: true },
              {},
              {
                group_id: gId,
              },
              {
                group_discussion_id: { $nin: allAbusivePosts },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "user",
            localField: "created_by",
            foreignField: "user_id",
            as: "Data",
          },
        },
        {
          $lookup: {
            from: "groupDiscussion",
            let: {
              group_discussion_id: "$group_discussion_id",
              user_id: user_id,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$$group_discussion_id", "$group_discussion_id"],
                      },
                      { $eq: ["$$user_id", "$created_by"] },
                    ],
                  },
                },
              },
            ],
            as: "is_creator",
          },
        },
        {
          $lookup: {
            from: "followers",
            let: { follower_of: "$created_by", user_id: user_id,
            // user_type:"USER"
           },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$$follower_of", "$follower_of"] },
                      { $eq: ["$$user_id", "$user_id"] },
                      { $eq: [true, "$is_active"] },
                      // { $eq: ["$$user_type", "$user_type"] },
                    ],
                  },
                },
              },
            ],
            as: "is_follower",
          },
        },
        {
          $lookup: {
            from: "followers",
            let: { follower_of: user_id, user_id: "$created_by",
            // user_type:"USER"
           },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$$follower_of", "$follower_of"] },
                      { $eq: ["$$user_id", "$user_id"] },
                      { $eq: [true, "$is_active"] },
                      // { $eq: ['$$user_type', "$user_type"] },
                    ],
                  },
                },
              },
            ],
            as: "is_following",
          },
        },
        {
          $sort: {
            created_at: -1,
          },
        },
      ])
      .toArray()
      .then(function (data) {
        var result = {};
        result.code = 200;

        var checkAllAbusivePosts = AbusivePosts.find({
          $or: [
            {
              user_id: user_id,
              post_type: "comment",
              status: {
                $in: [0, 1],
              },
            },
            {
              post_type: "comment",
              status: {
                $in: [1],
              },
            },
          ],
        }).fetch();

        var allAbusivePosts = [];
        for (var i = 0; i < checkAllAbusivePosts.length; i++) {
          allAbusivePosts.push(checkAllAbusivePosts[i].post_id);
        }
        for (var i = 0; i < data.length; i++) {
        
          
          var obj = {};
          obj.post_id = data[i].group_discussion_id;
          obj.is_active = true;
          obj.user_id = user_id;
          data[i].user_liked = Likes.find(obj).count() > 0;
          if (
            data[i].is_creator.length != 0 ||
            (data[i].is_follower.length != 0 ||
              data[i].is_following.length != 0)
          ) {
            delete obj.user_id;
            data[i].total_likes = Likes.find(obj).count();
          }

          var total_comments = UserComments.find({
            post_id: obj.post_id,
            post_on: "discussion",
            comment_id: {
              $nin: allAbusivePosts,
            },
            is_active: true,
          }).count();
          data[i].total_comments = total_comments;
        }

        result.all_discussions = data;
        return res.status(200).send(result);
      });
  }).run();
});

app.post('/fetch_all_discussion_likes',async (req, res) => {
  Fiber(async function () {
    let gId = req.body.group_id;
    let user_id = req.body.user_id;
    let discussion_id = req.body.discussion_id;

    var allLikes = await  Likes.rawCollection()
      .aggregate([
        {
         $match: {
           $and:[{post_id: discussion_id}, {is_active:true}]
          }
        },
        {
          $lookup: {
            from: "user",
            localField: "user_id",
            foreignField: "user_id",
            as: "user_details",
          },
        },
        {
          $project: {
            'user_details.name': 1,
            'user_details.email':1,
            'user_details.user_type': 1,
            'user_details.profile_picture': 1,
            'user_details.headline': 1,
            'user_details.gender': 1,
            'user_details.province': 1,
            'user_details.city': 1,
            'user_details.belongs_to': 1,
            
          },
        }
      ]).toArray();
      // console.log(allLikes);
      var result = {};
      result.code = 200;
      result.all_likes = allLikes;
      return res.status(200).send(result);
  }).run();
});


app.post('/fetch_all_post_likes',async (req, res) => {
  Fiber(async function () {

    let post_id = req.body.post_id;

    var allLikes = await  Likes.rawCollection()
      .aggregate([
        {
         $match: {
           $and:[{post_id: post_id}, {is_active:true}]
          }
        },
        {
          $lookup: {
            from: "user",
            localField: "user_id",
            foreignField: "user_id",
            as: "user_details",
          },
        },
        {
          $project: {
            'user_details.name': 1,
            'user_details.email':1,
            'user_details.user_type': 1,
            'user_details.profile_picture': 1,
            'user_details.headline': 1,
            'user_details.gender': 1,
            'user_details.province': 1,
            'user_details.city': 1,
            'user_details.belongs_to': 1,
            
          },
        }
      ]).toArray();
      // console.log("allLikes");
      // console.log(allLikes);
      var result = {};
      result.code = 200;
      result.all_likes = allLikes;
      return res.status(200).send(result);
  }).run();
});
app.post("/fetch_discussion_based_on_id", async (req, res) => {
  Fiber(async function () {
    let discussion_id = req.body.discussion_id;
    let user_id = req.body.user_id;
    // var groupDiscussion = GroupDiscussion.find({"group_discussion_id":discussion_id,is_active:true}).fetch();

    await GroupDiscussion.rawCollection()
      .aggregate([
        {
          $match: {
            $and: [
              { is_active: true },
              {},
              {
                group_discussion_id: discussion_id,
              },
            ],
          },
        },
        {
          $lookup: {
            from: "user",
            localField: "created_by",
            foreignField: "user_id",
            as: "Data",
          },
        },
        {
          $sort: {
            created_at: -1,
          },
        },
      ])
      .toArray()
      .then(function (data) {
        var result = {};
        result.code = 200;
        for (var i = 0; i < data.length; i++) {
          var obj = {};
          obj.post_id = data[i].group_discussion_id;
          obj.is_active = true;
          obj.user_id = user_id;
          data[i].user_liked = Likes.find(obj).count() > 0;
        }

        result.all_discussions = data;

        result.discussion_details = data;

        return res.status(200).send(result);
      });

    // var result = {};
    // result.code = 200;
    // result.discussion_details = groupDiscussion;

    // return res.status(200).send(result);
  }).run();
});

app.post("/fetch_all_connection_you_know", (req, res) => {
  Fiber(async function () {
    // console.log(req.body);
    let gId = req.body.group_id;
    let loginUserId = req.body.loginUserId;
    let result = {};
    let group = Group.find({ group_id: gId }).fetch();
    let groupCreatedBy = group[0].created_by;
    // console.log("groupCreatedBy", groupCreatedBy, loginUserId);
    var checkIfAlreadyFollower = Followers.find({
      $or: [
        { user_id: groupCreatedBy, is_active: true, follower_of: loginUserId },
        { user_id: loginUserId, is_active: true, follower_of: groupCreatedBy },
      ],
    }).fetch();
    //// console.log("checkIfAlreadyFollower",checkIfAlreadyFollower);
    if (checkIfAlreadyFollower.length > 0) {
      let data = GroupMember.find({
        group_id: gId,
        user_id: { $in: [req.body.loginUserId] },
      }).fetch();
      // // console.log("data",data);
      if (data.length > 0) {
        result.code = 200;
        result.is_member = true;
        result.message = "You are member of this group.";
      } else {
        result.code = 200;
        result.is_member = false;
        result.message = "You are not member of this group.";
      }
    } else {
      result.code = 900;
      result.message =
        "You need to unite first then can join  or start discussion";
    }
    return res.status(200).send(result);
  }).run();
});

WebApp.connectHandlers.use(app);

Meteor.publish(
  "fetch_group_members_based_on_group_id",
  function (id, loginUserId) {
    // // console.log("GroupMember id,loginUserId",id,loginUserId)
    return GroupMember.find({ group_id: id, user_id: { $in: [loginUserId] } });
  }
);
Meteor.publish("fetch_discussion_based_on_id", function (id) {
  // // console.log("GroupMember id,loginUserId",id,loginUserId)
  return GroupDiscussion.find({ group_discussion_id: id, is_active: true });
});
Meteor.publish("fetch_all_groups_where_user_is_member", function (id) {
  // // console.log("GroupMember id,loginUserId",id,loginUserId)

  var allGroupsWhereUserIsMember = GroupMember.find({
    user_id: id,
    status: 1,
  }).fetch();
  var excludedGroups = [];
  for (var i = 0; i < allGroupsWhereUserIsMember.length; i++) {
    var checkIfGroupActive = Group.find({
      is_active: true,
      group_id: allGroupsWhereUserIsMember[i].group_id,
    }).count();
    if (checkIfGroupActive != 0) {
      excludedGroups.push(allGroupsWhereUserIsMember[i].group_id);
    }
  }
  // console.log("excludedGroups");
  // console.log(excludedGroups);
  if (excludedGroups.length == 0) {
    return [];
  }
  return GroupMember.find({
    user_id: id,
    status: 1,
    group_id: { $in: excludedGroups },
  });
});

Meteor.publish("fetch_group_based_on_group_id", function (id) {
  //// console.log("hahahhahahaha",id)
  let self = this;
  let contentStoryView = [];
  Group.rawCollection()
    .aggregate([
      {
        $match: {
          $and: [{ is_active: true }, { group_id: id }],
        },
      },
      {
        $lookup: {
          from: "user",
          localField: "created_by",
          foreignField: "user_id",
          as: "Data",
        },
      },
      {
        $sort: {
          created_at: -1,
        },
      },
    ])
    .toArray()
    .then(function (result) {
      // // console.log(result)
      contentStoryView = result;
      contentStoryView.forEach((e) => {
        // // console.log(e)
        self.added("groupDataWithUser", e._id, e);
      });

      self.ready();
    });
  //  return Blog.find({}, {sort: {created_at: -1}});
});

Meteor.publish(
  "fetch_discussion_based_on_discussion_id",
  function (discussion_id) {
    return GroupDiscussion.find({ group_discussion_id: discussion_id });
  }
);

Meteor.publish("fetch_all_groups_created_by_user", function (user_id) {
  return Group.find({ created_by: user_id, is_active: true });
});
