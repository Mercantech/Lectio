using api.Context;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LeaderboardController : ControllerBase
    {
        private readonly LectioEnhancerDBContext _context;

        public LeaderboardController(LectioEnhancerDBContext context)
        {
            _context = context;
        }

        // GET: api/Leaderboard
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LeaderboardEntry>>> GetLeaderboard()
        {
            var leaderboard = await _context
                .LeaderboardEntries.Include(l => l.User)
                .OrderByDescending(l => l.TotalPoints)
                .ThenBy(l => l.LastUpdated)
                .Select(l => new LeaderboardEntryDTO
                {
                    Position = l.Position,
                    UserName = l.User.Name,
                    TotalPoints = l.TotalPoints,
                    LastUpdated = l.LastUpdated
                })
                .ToListAsync();

            return Ok(leaderboard);
        }

        // GET: api/Leaderboard/5
        [HttpGet("{userId}")]
        public async Task<ActionResult<LeaderboardEntry>> GetUserPosition(string userId)
        {
            var entry = await _context
                .LeaderboardEntries.Include(l => l.User)
                .FirstOrDefaultAsync(l => l.UserId == userId);

            if (entry == null)
            {
                return NotFound();
            }

            return Ok(
                new LeaderboardEntryDTO
                {
                    Position = entry.Position,
                    UserName = entry.User.Name,
                    TotalPoints = entry.TotalPoints,
                    LastUpdated = entry.LastUpdated
                }
            );
        }

        // PUT: api/Leaderboard/UpdatePositions
        [HttpPut("UpdatePositions")]
        public async Task<IActionResult> UpdateLeaderboardPositions()
        {
            var entries = await _context
                .LeaderboardEntries.OrderByDescending(l => l.TotalPoints)
                .ToListAsync();

            for (int i = 0; i < entries.Count; i++)
            {
                entries[i].Position = i + 1;
                entries[i].LastUpdated = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PUT: api/Leaderboard/AddPoints/5
        [HttpPut("AddPoints/{userId}")]
        public async Task<IActionResult> AddPoints(string userId, [FromBody] AddPointsDTO pointsDto)
        {
            var entry = await _context.LeaderboardEntries.FirstOrDefaultAsync(l =>
                l.UserId == userId
            );

            if (entry == null)
            {
                // Opret ny leaderboard entry hvis den ikke findes
                entry = new LeaderboardEntry
                {
                    UserId = userId,
                    TotalPoints = pointsDto.Points,
                    Position = await _context.LeaderboardEntries.CountAsync() + 1,
                    LastUpdated = DateTime.UtcNow
                };
                _context.LeaderboardEntries.Add(entry);
            }
            else
            {
                entry.TotalPoints += pointsDto.Points;
                entry.LastUpdated = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            await UpdateLeaderboardPositions();

            return NoContent();
        }

        // POST: api/Leaderboard
        [HttpPost]
        public async Task<ActionResult<LeaderboardEntry>> CreateLeaderboardEntry(string userId)
        {
            // Tjek om brugeren eksisterer
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Bruger ikke fundet" });
            }

            // Tjek om brugeren allerede har en leaderboard entry
            var existingEntry = await _context.LeaderboardEntries.FirstOrDefaultAsync(l =>
                l.UserId == userId
            );

            if (existingEntry != null)
            {
                return Conflict(new { message = "Bruger har allerede en leaderboard entry" });
            }

            // Opret ny leaderboard entry med 0 points
            var entry = new LeaderboardEntry
            {
                Id = Guid.NewGuid().ToString(),
                UserId = userId,
                TotalPoints = 0,
                Position = await _context.LeaderboardEntries.CountAsync() + 1,
                LastUpdated = DateTime.UtcNow
            };

            _context.LeaderboardEntries.Add(entry);
            await _context.SaveChangesAsync();
            await UpdateLeaderboardPositions();

            return CreatedAtAction(
                nameof(GetUserPosition),
                new { userId = entry.UserId },
                new LeaderboardEntryDTO
                {
                    Position = entry.Position,
                    UserName = user.Name,
                    TotalPoints = entry.TotalPoints,
                    LastUpdated = entry.LastUpdated
                }
            );
        }

        // GET: api/Leaderboard/Top10
        [HttpGet("Top10")]
        public async Task<ActionResult<IEnumerable<LeaderboardEntryDTO>>> GetTop10Leaderboard()
        {
            var top10 = await _context
                .LeaderboardEntries.Include(l => l.User)
                .OrderByDescending(l => l.TotalPoints)
                .ThenBy(l => l.LastUpdated)
                .Take(10)
                .Select(l => new LeaderboardEntryDTO
                {
                    Position = l.Position,
                    UserName = l.User.Name,
                    TotalPoints = l.TotalPoints,
                    LastUpdated = l.LastUpdated
                })
                .ToListAsync();

            return Ok(top10);
        }

        [HttpGet("school/{schoolId}")]
        public async Task<ActionResult<IEnumerable<LeaderboardEntryDTO>>> GetSchoolLeaderboard(
            int schoolId
        )
        {
            var schoolLeaderboard = await _context
                .LeaderboardEntries.Include(l => l.User)
                .Where(l => l.User.SchoolId == schoolId)
                .OrderByDescending(l => l.TotalPoints)
                .ThenBy(l => l.LastUpdated)
                .Select(l => new LeaderboardEntryDTO
                {
                    Position = l.Position,
                    UserName = l.User.Name,
                    TotalPoints = l.TotalPoints,
                    LastUpdated = l.LastUpdated,
                    SchoolName = l.User.School.Name
                })
                .ToListAsync();

            if (!schoolLeaderboard.Any())
            {
                return NotFound(new { message = "Ingen leaderboard-data fundet for denne skole" });
            }

            // Opdater positioner specifikt for skole-leaderboard
            for (int i = 0; i < schoolLeaderboard.Count; i++)
            {
                schoolLeaderboard[i].Position = i + 1;
            }

            return Ok(schoolLeaderboard);
        }
    }

    public class LeaderboardEntryDTO
    {
        public int Position { get; set; }
        public string UserName { get; set; }
        public int TotalPoints { get; set; }
        public DateTime LastUpdated { get; set; }
        public string SchoolName { get; set; }
    }

    public class AddPointsDTO
    {
        public int Points { get; set; }
    }
}
