import express from "express";
import rateLimit from "express-rate-limit";

import UserCtr from "../../controller/userController/userCtr";
import verifyToken from "../../middleware/auth/verifyToken";
// import uploadImage from "../../middleware/UploadImage";
// import verifyToken from "../../middleware/auth/verifyToken";

const userRouter = express.Router();

// Rate limiter for login route: allow up to 4 requests per IP per 3 minutes
const loginLimiter = rateLimit({
    windowMs: 3 * 60 * 1000, // 3 minutes
    max: 4,
    message: {
        message:
            "Too many login attempts from this IP, please try again after 3 minutes",
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
});

userRouter.post("/register", loginLimiter, UserCtr.registerCtr);
userRouter.post("/login", UserCtr.loginCtr);
userRouter.post("/refresh-token", UserCtr.refreshTokenCtr);
userRouter.post("/logout", UserCtr.logoutCtr);
// userRouter.get("/profile", verifyToken, UserCtr.profileCtr);
// userRouter.post("/forget-password", UserCtr.forgetpasswordCtr);
// userRouter.post("/change-password", verifyToken, UserCtr.changePasswordCtr);
// userRouter.post("/reset-password/:resetToken", UserCtr.resetpasswordCtr);
// userRouter.put(
//     "/update-profile",
//     verifyToken,
//     uploadImage.single("ProfileImage"),
//     UserCtr.editprofileCtr
// );
userRouter.get("/get-user", verifyToken, UserCtr.getUserCtr);
// userRouter.get("/get-token", UserCtr.gettoken);
// userRouter.post("/google-login", UserCtr.googleLogin);

// userRouter.post("/add-new-user", verifyToken, UserCtr.createUser);
// // In your user router file
// userRouter.put(
//     "/edit-created-user/:userId",
//     verifyToken,
//     UserCtr.editCreatedUser
// );
// userRouter.delete(
//     "/delete-created-user/:userId",
//     verifyToken,
//     UserCtr.deleteCreatedUser
// );
userRouter.get("/get-all-users", verifyToken, UserCtr.getAllUsers);

export default userRouter;