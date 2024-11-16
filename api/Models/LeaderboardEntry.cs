namespace api.Models
{
    public class LeaderboardEntry : Common
    {
        public string UserId { get; set; }
        public int TotalPoints { get; set; }
        public int Position { get; set; }
        public DateTime LastUpdated { get; set; }

        // Navigation property
        public User User { get; set; }
    }
}
