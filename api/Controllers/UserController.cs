using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using api.Context;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly LectioEnhancerDBContext _context;
        private readonly IConfiguration _configuration;

        public UsersController(LectioEnhancerDBContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // GET: api/Users
        [Authorize]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            var users = await _context
                .Users.Select(item => new UserDTO
                {
                    Id = item.Id,
                    Email = item.Email,
                    Name = item.Name,
                })
                .ToListAsync();

            return Ok(users);
        }

        // GET: api/Users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(String id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            return user;
        }

        // PUT: api/Users/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUser(String id, EditUserDTO editUser)
        {
            var user = await _context.Users.FindAsync(id);
            user.Email = editUser.Email;
            user.Name = editUser.Name;
            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Users
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<User>> PostUser(SignUpDTO newUser)
        {
            if (await _context.Users.AnyAsync(item => item.Name == newUser.Name))
            {
                return Conflict(new { message = "Username is already in use." });
            }

            if (await _context.Users.AnyAsync(item => item.Email == newUser.Email))
            {
                return Conflict(new { message = "Email is already in use." });
            }
            else if (!isValidEmail(newUser.Email))
            {
                return Conflict(new { message = "Email is not valid." });
            }

            if (!IsPasswordSecure(newUser.Password))
            {
                return Conflict(new { message = "Password is not secure." });
            }

            var user = MapSignUpDTOToUser(newUser);

            _context.Users.Add(user);
            try
            {
                await _context.SaveChangesAsync();

                // Opret leaderboard entry
                var leaderboardEntry = new LeaderboardEntry
                {
                    Id = Guid.NewGuid().ToString(),
                    UserId = user.Id,
                    TotalPoints = 0,
                    Position = await _context.LeaderboardEntries.CountAsync() + 1,
                    LastUpdated = DateTime.UtcNow
                };

                _context.LeaderboardEntries.Add(leaderboardEntry);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (UserExists(user.Id))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return Ok(new { user.Id, user.Name });
        }

        [HttpPost("simple")]
        public async Task<ActionResult<User>> CreateSimpleUser(SimpleUserDTO simpleUser)
        {
            if (await _context.Users.AnyAsync(item => item.Name == simpleUser.Name))
            {
                return Conflict(new { message = "Username is already in use." });
            }

            var user = new User
            {
                Id = Guid.NewGuid().ToString("N"),
                Name = simpleUser.Name,
                CreatedAt = DateTime.UtcNow.AddHours(2),
                SchoolId = simpleUser.SchoolId,
                Role = Role.Student
            };

            _context.Users.Add(user);
            try
            {
                await _context.SaveChangesAsync();

                var leaderboardEntry = new LeaderboardEntry
                {
                    Id = Guid.NewGuid().ToString(),
                    UserId = user.Id,
                    TotalPoints = 0,
                    Position = await _context.LeaderboardEntries.CountAsync() + 1,
                    LastUpdated = DateTime.UtcNow
                };

                _context.LeaderboardEntries.Add(leaderboardEntry);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (UserExists(user.Id))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return Ok(new { user.Id, user.Name });
        }

        [HttpPost("set-password")]
        public async Task<ActionResult> SetPassword(SetPasswordDTO setPasswordDto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Name == setPasswordDto.Name);

            if (user == null)
            {
                return NotFound(new { message = "Bruger ikke fundet." });
            }

            if (!IsPasswordSecure(setPasswordDto.NewPassword))
            {
                return BadRequest(new { message = "Kodeordet opfylder ikke sikkerhedskravene." });
            }

            // Generer nyt salt og hash kodeordet
            var salt = BCrypt.Net.BCrypt.GenerateSalt();
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(setPasswordDto.NewPassword, salt);

            // Opdater bruger med nyt kodeord og salt
            user.Password = hashedPassword;
            user.Salt = salt;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Kodeord oprettet succesfuldt." });
        }

        // POST: api/Users/login
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDTO login)
        {
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == login.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(login.Password, user.Password))
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }
            var token = GenerateJwtToken(user);
            return Ok(
                new
                {
                    token,
                    user.Name,
                    user.Id
                }
            );
        }

        // DELETE: api/Users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // TODO: Lav på front end???
        private bool IsPasswordSecure(String password)
        {
            var hasUpperCase = new Regex(@"[A-Z]+");
            var hasLowerCase = new Regex(@"[a-z]+");
            var hasDigits = new Regex(@"[0-9]+");
            var hasSpecialChar = new Regex(@"[\W_]+");
            var hasMinimum8Chars = new Regex(@".{8,}");

            return hasUpperCase.IsMatch(password)
                && hasLowerCase.IsMatch(password)
                && hasDigits.IsMatch(password)
                && hasSpecialChar.IsMatch(password)
                && hasMinimum8Chars.IsMatch(password);
        }

        private bool isValidEmail(String Email)
        {
            return new Regex(@"(?>(?:[0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+)[a-zA-Z]{2,9}").IsMatch(
                Email
            );
        }

        private User MapSignUpDTOToUser(SignUpDTO signUpDTO)
        {
            String hashedPassword = BCrypt.Net.BCrypt.HashPassword(signUpDTO.Password);
            String salt = hashedPassword.Substring(0, 29);

            return new User
            {
                Id = Guid.NewGuid().ToString("N"),
                Email = signUpDTO.Email,
                Name = signUpDTO.Name,
                CreatedAt = DateTime.UtcNow.AddHours(2),
                Password = hashedPassword,
                Salt = salt,
            };
        }

        private bool UserExists(String id)
        {
            return _context.Users.Any(e => e.Id == id);
        }

        private String GenerateJwtToken(User user)
        {
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.Name, user.Name)
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    _configuration["JwtSettings:Key"] ?? Environment.GetEnvironmentVariable("Key")
                )
            );
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                _configuration["JwtSettings:Issuer"]
                    ?? Environment.GetEnvironmentVariable("Issuer"),
                _configuration["JwtSettings:Audience"]
                    ?? Environment.GetEnvironmentVariable("Audience"),
                claims,
                expires: DateTime.Now.AddMinutes(30),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpPost("simple-login")]
        public async Task<IActionResult> SimpleLogin([FromBody] SimpleUserDTO simpleUser)
        {
            if (await _context.Users.AnyAsync(item => item.Name == simpleUser.Name))
            {
                var existingUser = await _context.Users.FirstAsync(u => u.Name == simpleUser.Name);
                var token = GenerateJwtToken(existingUser);
                return Ok(
                    new
                    {
                        token,
                        existingUser.Name,
                        existingUser.Id
                    }
                );
            }

            var user = new User
            {
                Id = Guid.NewGuid().ToString("N"),
                Name = simpleUser.Name,
                CreatedAt = DateTime.UtcNow.AddHours(2),
                SchoolId = simpleUser.SchoolId,
                Role = Role.Student
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var newToken = GenerateJwtToken(user);
            return Ok(
                new
                {
                    token = newToken,
                    user.Name,
                    user.Id
                }
            );
        }
    }
}
