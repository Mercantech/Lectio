namespace api.Models
{
    public class User : Common
    {
        public string Name { get; set; }
        public int StudentID { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
        public string? Salt { get; set; }
        public int schoolID { get; set; }
        public Role? Role { get; set; }
        public int CurrentPoints { get; set; }
        public int TotalAchievements { get; set; }
        public ICollection<UserAchievement> Achievements { get; set; }
        public LeaderboardEntry LeaderboardEntry { get; set; }
    }

    public class UserDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public Role? Role { get; set; }
    }

    public class SignUpDTO
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public int StudentID { get; set; }
    }

    public class LoginDTO
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class EditUserDTO
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public Role? Role { get; set; }
    }

    public class SimpleUserDTO
    {
        public string Name { get; set; }
    }

    public class SetPasswordDTO
    {
        public string Name { get; set; }
        public string NewPassword { get; set; }
    }

    public enum Role
    {
        Admin,
        Teacher,
        Student
    }
}
