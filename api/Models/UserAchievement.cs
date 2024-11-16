namespace api.Models
{
    public class UserAchievement : Common
    {
        public string UserId { get; set; }
        public string AchievementId { get; set; }
        public DateTime UnlockedAt { get; set; }

        // Navigation properties
        public User User { get; set; }
        public Achievement Achievement { get; set; }
    }
}
