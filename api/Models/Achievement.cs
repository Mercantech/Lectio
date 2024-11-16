namespace api.Models
{
    public class Achievement : Common
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string IconUrl { get; set; }
        public int PointValue { get; set; }
        public AchievementType Type { get; set; }
        public AchievementRarity Rarity { get; set; }

        // Navigation properties
        public ICollection<UserAchievement> UserAchievements { get; set; }
    }

    public enum AchievementType
    {
        Login,
        Attendance,
        Homework,
        Participation,
        Special
    }

    public enum AchievementRarity
    {
        Common = 1,
        Uncommon = 2,
        Rare = 3,
        Epic = 4,
        Legendary = 5
    }
}
