using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Context
{
    public class LectioEnhancerDBContext : DbContext
    {
        public LectioEnhancerDBContext(DbContextOptions<LectioEnhancerDBContext> options)
            : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Achievement> Achievements { get; set; }
        public DbSet<UserAchievement> UserAchievements { get; set; }
        public DbSet<LeaderboardEntry> LeaderboardEntries { get; set; }
        public DbSet<School> Schools { get; set; }

        public override int SaveChanges()
        {
            UpdateTimestamps();
            return base.SaveChanges();
        }

        public override async Task<int> SaveChangesAsync(
            CancellationToken cancellationToken = default
        )
        {
            UpdateTimestamps();
            return await base.SaveChangesAsync(cancellationToken);
        }

        private void UpdateTimestamps()
        {
            var entries = ChangeTracker
                .Entries()
                .Where(e =>
                    e.Entity is Common
                    && (e.State == EntityState.Added || e.State == EntityState.Modified)
                );

            foreach (var entry in entries)
            {
                var entity = (Common)entry.Entity;

                if (entry.State == EntityState.Added)
                {
                    if (string.IsNullOrEmpty(entity.Id))
                    {
                        entity.Id = Guid.NewGuid().ToString();
                    }
                    entity.CreatedAt = DateTime.UtcNow;
                }

                entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>().HasIndex(u => u.Name).IsUnique();

            modelBuilder
                .Entity<UserAchievement>()
                .HasKey(ua => new { ua.UserId, ua.AchievementId });

            modelBuilder
                .Entity<UserAchievement>()
                .HasOne(ua => ua.User)
                .WithMany(u => u.Achievements)
                .HasForeignKey(ua => ua.UserId);

            modelBuilder
                .Entity<LeaderboardEntry>()
                .HasOne(le => le.User)
                .WithOne(u => u.LeaderboardEntry)
                .HasForeignKey<LeaderboardEntry>(le => le.UserId);

            modelBuilder.Entity<School>().HasIndex(s => s.SchoolId).IsUnique();

            modelBuilder
                .Entity<User>()
                .HasOne(u => u.School)
                .WithMany(s => s.Users)
                .HasForeignKey(u => u.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
